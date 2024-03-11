import AnnotationService, { AnnotationValue } from "..";
import DatabaseService from "../../DatabaseService";
import DatabaseServiceNoop from "../../DatabaseService/DatabaseServiceNoop";
import Annotation from "../../../entity/Annotation";
import FileFilter from "../../../entity/FileFilter";
import { AnnotationType } from "../../../entity/AnnotationFormatter";

interface Config {
    databaseService: DatabaseService;
}

interface DescribeQueryResult {
    [key: string]: string;
    column_name: string;
    column_type: string;
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

    constructor(config: Config = { databaseService: new DatabaseServiceNoop() }) {
        this.databaseService = config.databaseService;
    }

    private static columnTypeToAnnotationType(columnType: string): string {
        switch (columnType) {
            // TODO: WRITE TICKET - I assume we need to do more here, like for dates at least? or durations?
            case "INTEGER":
            case "BIGINT":
                return AnnotationType.NUMBER;
            case "VARCHAR":
            case "TEXT":
            default:
                return AnnotationType.STRING;
        }
    }

    /**
     * Fetch all annotations.
     */
    public async fetchAnnotations(): Promise<Annotation[]> {
        const sql = `DESCRIBE ${this.databaseService.table}`;
        const rows = (await this.databaseService.query(sql)) as DescribeQueryResult[];
        return rows.map(
            (row) =>
                new Annotation({
                    annotationDisplayName: row["column_name"],
                    annotationName: row["column_name"],
                    // TODO: WRITE TICKET - Enable via separate file
                    description: "",
                    type: DatabaseAnnotationService.columnTypeToAnnotationType(row["column_type"]),
                })
        );
    }

    /**
     * Fetch the unique values for a specific annotation.
     */
    public async fetchValues(annotation: string): Promise<AnnotationValue[]> {
        const select_key = "select_key";
        const sql = `SELECT DISTINCT "${annotation}" AS ${select_key} FROM ${this.databaseService.table}`;
        const rows = await this.databaseService.query(sql);
        return [
            ...rows.reduce((valueSet, row) => {
                `${row[select_key]}`.split(",").forEach((value) => valueSet.add(value.trim()));
                return valueSet;
            }, new Set<string>()),
        ];
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
        const filtersByAnnotation = filters.reduce((map, filter) => {
            const annotationValues = map[filter.name] ? map[filter.name] : [];
            annotationValues.push(filter.value);
            return { ...map, [filter.name]: annotationValues };
        }, {} as { [name: string]: (string | null)[] });
        hierarchy
            // Map before filter because index is important to map to the path
            .forEach((annotation, index) => {
                if (!filtersByAnnotation[annotation]) {
                    filtersByAnnotation[annotation] = [index < path.length ? path[index] : null];
                }
            });
        const whereFilters = Object.keys(filtersByAnnotation).map((annotation) => {
            const annotationValues = filtersByAnnotation[annotation];
            if (annotationValues[0] === null) {
                return `"${annotation}" IS NOT NULL`;
            }
            return annotationValues.map((value) => `"${annotation}" = '${value}'`).join(") OR (");
        });
        const sql = `                                       
            SELECT DISTINCT "${hierarchy[path.length]}"
            FROM ${this.databaseService.table}                                    
            WHERE (${whereFilters.join(") AND (")})
        `;
        const rows = await this.databaseService.query(sql);
        return rows.map((row) => row[hierarchy[path.length]]);
    }

    /**
     * Fetchs annotations that can be combined with current hierarchy while still producing a non-empty
     * file set
     */
    public async fetchAvailableAnnotationsForHierarchy(annotations: string[]): Promise<string[]> {
        const whereConditions = annotations
            .map((annotation) => `"${annotation}" IS NOT NULL`)
            .join(" AND ");
        const sql = `
            SUMMARIZE SELECT * 
            FROM ${this.databaseService.table}
            ${whereConditions ? `WHERE ${whereConditions}` : ""}
        `;
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
