import { isNil, uniq } from "lodash";

import AnnotationService, { AnnotationDetails, AnnotationValue } from "..";
import DatabaseService from "../../DatabaseService";
import DatabaseServiceNoop from "../../DatabaseService/DatabaseServiceNoop";
import { AnnotationType } from "../../../entity/AnnotationFormatter";
import Annotation from "../../../entity/Annotation";
import FileFilter, { FilterType } from "../../../entity/FileFilter";
import IncludeFilter from "../../../entity/FileFilter/IncludeFilter";
import SQLBuilder from "../../../entity/SQLBuilder";

interface Config {
    databaseService: DatabaseService;
    dataSourceNames: string[];
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

    constructor(
        config: Config = { dataSourceNames: [], databaseService: new DatabaseServiceNoop() }
    ) {
        this.dataSourceNames = config.dataSourceNames;
        this.databaseService = config.databaseService;
    }

    /**
     * Fetch all annotations.
     */
    public fetchAnnotations(): Promise<Annotation[]> {
        // TODO:
        return this.databaseService.fetchAnnotations(this.dataSourceNames);
    }

    /**
     * Fetch details about annotations like their type and dropdown options
     * this isn't necessarily something we need to do for database annotations
     * so this might just be cruft we can remove with adjustments to the AICS FMS
     * data flow by having types be passed as is in the annotation response (big lift in FES)
     */
    public async fetchAnnotationDetails(name: string): Promise<AnnotationDetails> {
        const annotationNameToTypeMap = await this.databaseService.fetchAnnotationTypes();
        const type = annotationNameToTypeMap[name] as AnnotationType;
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
        // TODO:
        return this.fetchFilteredValuesForAnnotation(annotation);
    }

    public async fetchRootHierarchyValues(
        hierarchy: string[],
        filters: FileFilter[]
    ): Promise<string[]> {
        // TODO:
        return this.fetchHierarchyValuesUnderPath(hierarchy, [], filters);
    }

    public async fetchHierarchyValuesUnderPath(
        hierarchy: string[],
        path: string[],
        filters: FileFilter[]
    ): Promise<string[]> {
        // TODO:
        // Look up annotation metadata so virtual sub-field annotations get correct FileFilters.
        const allAnnotations = await this.databaseService.fetchAnnotations(this.dataSourceNames);
        const annotationMetaMap = new Map(allAnnotations.map((a) => [a.name, a]));

        // Build a FileFilter for an annotation, using json_extract SQL for virtual sub-fields.
        const makeFilter = (annotationName: string, value?: string): FileFilter => {
            const meta = annotationMetaMap.get(annotationName);
            if (meta?.isNestedSubField && meta.nestedParent && meta.nestedJsonPath) {
                const filterType = value !== undefined ? FilterType.DEFAULT : FilterType.ANY;
                return new FileFilter(
                    annotationName,
                    value ?? "",
                    filterType,
                    meta.nestedJsonPath,
                    meta.nestedParent
                );
            }
            if (value !== undefined) {
                return new FileFilter(annotationName, value);
            }
            return new IncludeFilter(annotationName);
        };

        const filtersByAnnotation = filters.reduce(
            (map, filter) => ({
                ...map,
                [filter.name]: map[filter.name] ? [...map[filter.name], filter] : [filter],
            }),
            {} as { [name: string]: FileFilter[] }
        );

        hierarchy
            // Map before filter because index is important to map to the path
            .forEach((annotation, index) => {
                if (!filtersByAnnotation[annotation]) {
                    filtersByAnnotation[annotation] = [
                        index < path.length
                            ? makeFilter(annotation, path[index])
                            : makeFilter(annotation), // If no value provided, equivalent to Include filter
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

        // Detect virtual sub-field annotations: names like "Well.Gene" that don't exist as
        // physical columns. These come from JSON VARCHAR columns with dynamic outer keys.
        // The Annotation cache holds `nestedParent` / `nestedJsonPath` for them; here we derive
        // those from the name by looking up the registered annotations.
        const allAnnotations = await this.databaseService.fetchAnnotations(this.dataSourceNames);
        const annotationMeta = allAnnotations.find((a) => a.name === annotation);
        const isVirtual = annotationMeta?.isNestedSubField === true;

        let selectExpr: string;
        let resultAlias: string;

        if (isVirtual && annotationMeta?.nestedParent && annotationMeta?.nestedJsonPath) {
            const parent = annotationMeta.nestedParent;
            const jsonPath = annotationMeta.nestedJsonPath; // e.g. "$[*].Gene" or "$[*].Dose[*].Value"
            // json_extract with a $[*] wildcard returns a JSON array of all matching values
            // across every element of the array column (e.g. '["TP53","MYC",...]').
            // We'll flatten the JSON arrays row-by-row below.
            resultAlias = "__nested_values__";
            selectExpr = `DISTINCT CAST(json_extract("${parent}"::JSON, '${jsonPath}') AS VARCHAR) AS "${resultAlias}"`;
        } else {
            resultAlias = annotation;
            selectExpr = `DISTINCT "${annotation}"`;
        }

        const sqlBuilder = new SQLBuilder()
            .select(selectExpr)
            .from(this.dataSourceNames);

        Object.keys(filtersByAnnotation).forEach((annotationToFilter) => {
            const appliedFilters = filtersByAnnotation[annotationToFilter];
            sqlBuilder.where(
                appliedFilters.map((filter) => filter.toSQLWhereString()).join(" OR ")
            );
        });

        const rows = await this.databaseService.query(sqlBuilder.toSQL());

        if (isVirtual) {
            // Each result row is a JSON array string like '["TP53","MYC"]' — flatten all values.
            const values = new Set<string>();
            for (const row of rows) {
                const raw = row[resultAlias];
                if (isNil(raw)) continue;
                try {
                    const parsed = JSON.parse(String(raw));
                    if (Array.isArray(parsed)) {
                        parsed.forEach((v) => {
                            if (v !== null && v !== undefined) values.add(String(v).trim());
                        });
                    } else if (parsed !== null) {
                        values.add(String(parsed).trim());
                    }
                } catch {
                    String(raw)
                        .split(DatabaseService.LIST_DELIMITER)
                        .forEach((v) => values.add(v.trim()));
                }
            }
            return [...values];
        }

        const rowsSplitByDelimiter = rows
            .flatMap((row) =>
                isNil(row[annotation])
                    ? []
                    : `${row[annotation]}`.split(DatabaseService.LIST_DELIMITER)
            )
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

        const aggregateDataSourceName = this.dataSourceNames.sort().join(", ");

        // Fetch annotation metadata so virtual sub-field annotations get correct WHERE clauses.
        const allAnnotations = await this.databaseService.fetchAnnotations(this.dataSourceNames);
        const annotationMetaMap = new Map(allAnnotations.map((a) => [a.name, a]));

        // Build the IS NOT NULL / json existence check for an annotation in the hierarchy.
        const hierarchyExistsClause = (annotationName: string): string => {
            const meta = annotationMetaMap.get(annotationName);
            if (meta?.isNestedSubField && meta.nestedParent && meta.nestedJsonPath) {
                return `json_array_length(json_extract("${meta.nestedParent}"::JSON, '${meta.nestedJsonPath}')) > 0`;
            }
            return `"${annotationName}" IS NOT NULL`;
        };

        const hierarchyWhereClauses = annotations.map(hierarchyExistsClause);

        // Physical columns: discovered from a LIMIT 1 query.
        const columnNamesSql = new SQLBuilder()
            .from(aggregateDataSourceName)
            .limit(1)
            .toSQL();
        const queryResult = await this.databaseService.query(columnNamesSql);
        const physicalColumnNames = Object.keys(queryResult[0]);

        // Virtual sub-field annotations are not physical columns but still need to be checked.
        const virtualAnnotations = allAnnotations.filter((a) => a.isNestedSubField);

        // For each candidate annotation, check whether at least one row satisfies both
        // the candidate's own existence condition AND all current hierarchy constraints.
        const candidates: Array<{ name: string; existsClause: string }> = [
            ...physicalColumnNames.map((col) => ({
                name: col,
                existsClause: `"${col}" IS NOT NULL`,
            })),
            ...virtualAnnotations.map((a) => ({
                name: a.name,
                existsClause: `json_array_length(json_extract("${a.nestedParent!}"::JSON, '${a.nestedJsonPath!}')) > 0`,
            })),
        ];

        const queries = candidates.map(({ name, existsClause }) => {
            const escapedName = name.replaceAll("'", "''");
            const sql = new SQLBuilder()
                .select(`'${escapedName}' AS column_name`)
                .from(aggregateDataSourceName)
                .where(existsClause)
                .where(hierarchyWhereClauses)
                .limit(1)
                .toSQL();
            return this.databaseService.query(sql);
        });

        const results = (await Promise.all(queries)) as QueryResult[][];
        return results
            .filter((result) => result.length > 0)
            .map((result) => result[0].column_name);
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
}
