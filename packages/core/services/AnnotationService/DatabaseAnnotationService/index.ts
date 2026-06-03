import { isNil, uniq } from "lodash";

import AnnotationService, { AnnotationDetails, AnnotationValue } from "..";
import DatabaseService from "../../DatabaseService";
import DatabaseServiceNoop from "../../DatabaseService/DatabaseServiceNoop";
import { AnnotationType } from "../../../entity/AnnotationFormatter";
import Annotation from "../../../entity/Annotation";
import FileFilter, { FilterType } from "../../../entity/FileFilter";
import IncludeFilter from "../../../entity/FileFilter/IncludeFilter";
import { Source } from "../../../entity/SearchParams";
import SQLBuilder from "../../../entity/SQLBuilder";

interface Config {
    databaseService: DatabaseService;
    dataSourceNames: string[];
    metadataSource?: Source;
}

interface QueryResult {
    column_name: string;
}

/**
 * Service responsible for fetching annotation related metadata directly from a database
 */
export default class DatabaseAnnotationService implements AnnotationService {
    private readonly databaseService: DatabaseService;
    private readonly dataSourceNames: string[];
    private readonly metadataSource: Source | undefined;

    constructor(
        config: Config = { dataSourceNames: [], databaseService: new DatabaseServiceNoop() }
    ) {
        this.dataSourceNames = config.dataSourceNames;
        this.databaseService = config.databaseService;
        this.metadataSource = config.metadataSource;
    }

    /**
     * Fetch all annotations.
     */
    public fetchAnnotations(): Promise<Annotation[]> {
        return this.databaseService.fetchAnnotations(this.dataSourceNames, this.metadataSource);
    }

    /**
     * Fetch details about annotations like their type and dropdown options
     * this isn't necessarily something we need to do for database annotations
     * so this might just be cruft we can remove with adjustments to the AICS FMS
     * data flow by having types be passed as is in the annotation response (big lift in FES)
     */
    public async fetchAnnotationDetails(name: string): Promise<AnnotationDetails> {
        const annotationNameToTypeMap = await this.databaseService.fetchAnnotationTypes();
        const type = annotationNameToTypeMap[name];
        // If the annotation type is not recognized, default to string
        if (!Object.values(AnnotationType).includes(type) || type === AnnotationType.LOOKUP) {
            return { type: AnnotationType.STRING };
        }
        if (type === AnnotationType.DROPDOWN) {
            const dropdownOptions = await this.fetchValues(name);
            return { type, dropdownOptions: dropdownOptions as string[] };
        }
        return { type };
    }

    /**
     * Fetch the unique values for a specific annotation.
     */
    public async fetchValues(annotation: string): Promise<AnnotationValue[]> {
        return this.fetchFilteredValuesForAnnotation(annotation);
    }

    public async fetchRootHierarchyValues(
        hierarchy: string[],
        filters: FileFilter[]
    ): Promise<string[]> {
        return this.fetchHierarchyValuesUnderPath(hierarchy, [], filters);
    }

    public async fetchHierarchyValuesUnderPath(
        hierarchy: string[],
        path: string[],
        filters: FileFilter[]
    ): Promise<string[]> {
        const filtersByAnnotation = filters.reduce(
            (map, filter) => ({
                ...map,
                [filter.name]: map[filter.name] ? [...map[filter.name], filter] : [filter],
            }),
            {} as { [name: string]: FileFilter[] }
        );

        // Look up annotation metadata to determine nestedParent for internal filters.
        // Keyed by full dotted path (e.g. "Well.Column") so hierarchy entries like
        // "Well.Column" resolve to the annotation with path ["Well","Column"].
        // TODO: This is an N+1 fetch when cache isn't ready — fetchFilteredValuesForAnnotation also calls
        // fetchAnnotations() independently. Pass the annotations through to avoid the
        // second round-trip once this stabilizes or share the promise?
        const annotations = await this.fetchAnnotations();
        const annotationMetaMap = new Map(annotations.map((a) => [a.path.join("."), a]));

        hierarchy
            // Map before filter because index is important to map to the path
            .forEach((annotation, index) => {
                if (!filtersByAnnotation[annotation]) {
                    const meta = annotationMetaMap.get(annotation);
                    const annotationPath = meta?.path ?? annotation.split(".");
                    filtersByAnnotation[annotation] = [
                        index < path.length
                            ? new FileFilter(annotationPath, path[index], FilterType.DEFAULT, meta?.type, meta?.pathIsArray)
                            : new IncludeFilter(annotationPath, meta?.pathIsArray), // If no value provided in hierarchy, equivalent to Include filter
                    ];
                }
            });

        return this.fetchFilteredValuesForAnnotation(hierarchy[path.length], filtersByAnnotation);
    }

    // Given a particular annotation in the hierarchy list, apply filters to the files in that category
    private async fetchFilteredValuesForAnnotation(
        annotation: string,
        filtersByAnnotation: {
            [name: string]: FileFilter[];
        } = {}
    ): Promise<string[]> {
        if (!this.dataSourceNames.length) {
            return [];
        }

        // Look up annotation metadata to determine if this is a nested sub-field.
        const nameToAnnotationMap = await this.fetchNameToAnnotationMap();
        const annotationMeta = nameToAnnotationMap.get(annotation);

        let selectExpr: string;
        if (annotationMeta?.isSubField && annotationMeta.path.length > 1) {
            // For nested sub-fields, unnest the list_transform expression and alias it.
            // DISTINCT is intentionally omitted here: DuckDB does not support
            // "SELECT DISTINCT unnest(...)" — JS-side uniq() deduplicates instead.
            selectExpr = `unnest(${SQLBuilder.buildNestedAccessExpression(annotationMeta.path, annotationMeta.pathIsArray)}) AS "${annotation}"`;
        } else {
            selectExpr = `DISTINCT "${annotation}"`;
        }

        const sqlBuilder = new SQLBuilder()
            .select(selectExpr)
            .from(this.dataSourceNames);

        // Separate flat vs nested filters, correlating nested sub-field filters
        // that share the same root parent (ensures same-element matching)
        const flatGroups: { [key: string]: FileFilter[] } = {};
        const nestedByParent = new Map<string, FileFilter[]>();

        Object.keys(filtersByAnnotation).forEach((annotationToFilter) => {
            const appliedFilters = filtersByAnnotation[annotationToFilter];
            const sample = appliedFilters[0];
            if (sample && sample.path.length > 1) {
                const parent = sample.path[0];
                if (!nestedByParent.has(parent)) nestedByParent.set(parent, []);
                nestedByParent.get(parent)!.push(...appliedFilters);
            } else {
                flatGroups[annotationToFilter] = appliedFilters;
            }
        });

        Object.values(flatGroups).forEach((appliedFilters) => {
            sqlBuilder.where(
                appliedFilters.map((filter) => filter.toSQLWhereString()).join(" OR ")
            );
        });

        for (const [_, parentFilters] of nestedByParent) {
            sqlBuilder.where(FileFilter.toCorrelatedSQLWhereString(parentFilters));
        }

        const rows = await this.databaseService.query(sqlBuilder.toSQL()).promise;
        const rowsSplitByDelimiter = rows
            .flatMap((row) => {
                if (isNil(row[annotation])) return [];
                // For array columns (e.g. VARCHAR[]), DuckDB returns JS arrays after
                // the JSON round-trip. Flatten them so each element is treated individually.
                if (Array.isArray(row[annotation])) {
                    return row[annotation].map((v: unknown) => String(v).trim());
                }
                return String(row[annotation]).split(DatabaseService.LIST_DELIMITER);
            })
            .map((value) => value.trim());
        return uniq(rowsSplitByDelimiter);
    }

    /**
     * Fetchs annotations that can be combined with current hierarchy while still producing a non-empty
     * file set
     */
    public async fetchAvailableAnnotationsForHierarchy(annotations: string[]): Promise<string[]> {
        if (!this.dataSourceNames.length) {
            return [];
        }

        // Look up annotation metadata for nested sub-field handling.
        const nameToAnnotationMap = await this.fetchNameToAnnotationMap();

        // Build proper IS NOT NULL expressions for the current hierarchy annotations:
        // For nested sub-fields, use len(list_transform(...)) > 0 instead of "name" IS NOT NULL
        const hierarchyNotNullExprs = annotations.map((annotation) => {
            const meta = nameToAnnotationMap.get(annotation);
            if (meta?.isSubField && meta.path.length > 1) {
                return `len(${SQLBuilder.buildNestedAccessExpression(meta.path, meta.pathIsArray)}) > 0`;
            }
            return `"${annotation}" IS NOT NULL`;
        });

        // Subquery 1
        const aggregateDataSourceName = this.dataSourceNames.sort().join(", ");
        const columnNamesSql = new SQLBuilder().from(aggregateDataSourceName).limit(1).toSQL();
        const queryResult = await this.databaseService.query(columnNamesSql).promise;
        const columnNames = Object.keys(queryResult[0]);

        const queries = columnNames.map((columnName) => {
            const sql = new SQLBuilder()
                .select(`'${columnName.replace(/'/g, "''")}' AS column_name`)
                .from(aggregateDataSourceName)
                .where(`"${columnName}" IS NOT NULL`)
                .where(hierarchyNotNullExprs)
                // This limit is non-deterministic, but we just want to know if
                // any rows are non-null for this column, and a
                // non-deterministic query will be faster.
                .limit(1)
                .toSQL();
            return this.databaseService.query(sql).promise;
        });
        const results = (await Promise.all(queries)) as QueryResult[][];
        const availablePhysicalColumns = new Set(
            results.filter((result) => result.length > 0).map((result) => result[0].column_name)
        );

        // Include virtual sub-field annotations for any available parent STRUCT columns
        const availableAnnotations = [...availablePhysicalColumns];
        for (const ann of nameToAnnotationMap.values()) {
            if (ann.isSubField && ann.parents?.[0] && availablePhysicalColumns.has(ann.parents[0])) {
                availableAnnotations.push(ann.name);
            }
        }
        return uniq(availableAnnotations);
    }

    /**
     * Validate annotation values according the type the annotation they belong to.
     */
    public validateAnnotationValues(_name: string, _values: AnnotationValue[]): Promise<boolean> {
        // At the moment we don't have any constraints we need to adhere to for edits to annotation values
        // eventually we may want to add some validation to make sure dates are in the correct format, etc.
        return Promise.resolve(true);
    }

    public createAnnotation(annotation: Annotation): Promise<void> {
        const tableName = this.dataSourceNames.sort().join(DatabaseService.LIST_DELIMITER);
        return this.databaseService.addNewColumn(
            tableName,
            annotation.name,
            annotation.description
        );
    }

    private async fetchNameToAnnotationMap(): Promise<Map<string, Annotation>> {
        const annotations = await this.fetchAnnotations();
        return new Map(annotations.map((a) => [a.path.join("."), a]));
    }
}
