import { isNil, uniq } from "lodash";

import AnnotationService, { AnnotationDetails, AnnotationValue } from "..";
import DatabaseService from "../../DatabaseService";
import DatabaseServiceNoop from "../../DatabaseService/DatabaseServiceNoop";
import { AnnotationType } from "../../../entity/AnnotationFormatter";
import Annotation from "../../../entity/Annotation";
import FileFilter from "../../../entity/FileFilter";
import IncludeFilter from "../../../entity/FileFilter/IncludeFilter";
import { Source } from "../../../entity/SearchParams";
import SQLBuilder from "../../../entity/SQLBuilder";

/**
 * SQL used by fetchFilteredValuesForAnnotation — exported so the benchmark can run the same query.
 */
export function buildDistinctValuesSQL(
    annotation: string,
    dataSourceNames: string | string[],
    filters: FileFilter[] = []
): string {
    const builder = new SQLBuilder().select(`DISTINCT "${annotation}"`).from(dataSourceNames);
    const filtersByAnnotation = filters.reduce(
        (map, filter) => ({
            ...map,
            [filter.name]: map[filter.name] ? [...map[filter.name], filter] : [filter],
        }),
        {} as { [name: string]: FileFilter[] }
    );
    Object.values(filtersByAnnotation).forEach((appliedFilters) => {
        builder.where(appliedFilters.map((f) => f.toSQLWhereString()).join(" OR "));
    });
    return builder.toSQL();
}

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

        hierarchy
            // Map before filter because index is important to map to the path
            .forEach((annotation, index) => {
                if (!filtersByAnnotation[annotation]) {
                    filtersByAnnotation[annotation] = [
                        index < path.length
                            ? new FileFilter(annotation, path[index])
                            : new IncludeFilter(annotation), // If no value provided in hierachy, equivalent to Include filter
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

        const allFilters = Object.values(filtersByAnnotation).flat();
        const rows = await this.databaseService.query(
            buildDistinctValuesSQL(annotation, this.dataSourceNames, allFilters)
        ).promise;
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

        // Subquery 1
        const aggregateDataSourceName = this.dataSourceNames.sort().join(", ");
        const columnNamesSql = new SQLBuilder().from(aggregateDataSourceName).limit(1).toSQL();
        const queryResult = await this.databaseService.query(columnNamesSql).promise;
        const columnNames = Object.keys(queryResult[0]);

        const queries = columnNames.map((columnName) => {
            const sql = new SQLBuilder()
                .select(`'${columnName}' AS column_name`)
                .from(aggregateDataSourceName)
                .where(`"${columnName}" IS NOT NULL`)
                .where(annotations.map((annotation) => `"${annotation}" IS NOT NULL`))
                // This limit is non-deterministic, but we just want to know if
                // any rows are non-null for this column, and a
                // non-deterministic query will be faster.
                .limit(1)
                .toSQL();
            return this.databaseService.query(sql).promise;
        });
        const results = (await Promise.all(queries)) as QueryResult[][];
        return results.filter((result) => result.length > 0).map((result) => result[0].column_name);
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
