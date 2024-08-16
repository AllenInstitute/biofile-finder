import { isNil, uniq } from "lodash";

import AnnotationService, { AnnotationValue } from "..";
import DatabaseService from "../../DatabaseService";
import DatabaseServiceNoop from "../../DatabaseService/DatabaseServiceNoop";
import Annotation from "../../../entity/Annotation";
import FileFilter from "../../../entity/FileFilter";
import SQLBuilder from "../../../entity/SQLBuilder";

interface Config {
    databaseService: DatabaseService;
    dataSourceNames: string[];
}

interface SummarizeQueryResult {
    [key: string]: string;
    column_name: string;
    null_percentage: string;
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
        return this.databaseService.fetchAnnotations(this.dataSourceNames);
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
                [filter.name]: map[filter.name]
                    ? [...map[filter.name], filter.value]
                    : [filter.value],
            }),
            {} as { [name: string]: (string | null)[] }
        );

        hierarchy
            // Map before filter because index is important to map to the path
            .forEach((annotation, index) => {
                if (!filtersByAnnotation[annotation]) {
                    filtersByAnnotation[annotation] = [index < path.length ? path[index] : null];
                }
            });

        return this.fetchFilteredValuesForAnnotation(hierarchy[path.length], filtersByAnnotation);
    }

    private async fetchFilteredValuesForAnnotation(
        annotation: string,
        filtersByAnnotation: { [name: string]: (string | null)[] } = {}
    ): Promise<string[]> {
        const sqlBuilder = new SQLBuilder()
            .select(`DISTINCT "${annotation}"`)
            .from(this.dataSourceNames);

        Object.keys(filtersByAnnotation).forEach((annotationToFilter) => {
            const annotationValues = filtersByAnnotation[annotationToFilter];
            if (annotationValues[0] === null) {
                sqlBuilder.where(`"${annotationToFilter}" IS NOT NULL`);
            } else {
                sqlBuilder.where(
                    annotationValues
                        .map((v) => SQLBuilder.regexMatchValueInList(annotationToFilter, v))
                        .join(") OR (")
                );
            }
        });

        const rows = await this.databaseService.query(sqlBuilder.toSQL());
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
        const sql = new SQLBuilder()
            .summarize()
            .from(this.dataSourceNames)
            .where(annotations.map((annotation) => `"${annotation}" IS NOT NULL`))
            .toSQL();
        const rows = (await this.databaseService.query(sql)) as SummarizeQueryResult[];
        const annotationSet = new Set(annotations);
        return rows
            .reduce((annotations, row) => {
                if (row["null_percentage"] !== "100.0%") {
                    annotations.push(row["column_name"]);
                }
                return annotations;
            }, [] as string[])
            .filter((annotation) => !annotationSet.has(annotation));
    }
}
