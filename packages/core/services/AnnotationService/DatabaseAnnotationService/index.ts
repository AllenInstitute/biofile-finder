import AnnotationService, { AnnotationValue } from "..";
import DatabaseService from "../../DatabaseService";
import DatabaseServiceNoop from "../../DatabaseService/DatabaseServiceNoop";
import Annotation from "../../../entity/Annotation";
import FileFilter from "../../../entity/FileFilter";
import { AnnotationType } from "../../../entity/AnnotationFormatter";

interface Config {
    database: DatabaseService;
}

// TODO: move into database?
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
 * todo
 */
export default class CsvAnnotationService implements AnnotationService {
    private readonly database: DatabaseService;

    constructor(config: Config = { database: new DatabaseServiceNoop() }) {
        this.database = config.database;
    }

    private static columnTypeToAnnotationType(columnType: string): string {
        switch (columnType) {
            // TODO: use column_type to get real type...?
            case "INTEGER":
                return AnnotationType.NUMBER;
            case "VARCHAR":
            case "TEXT":
            default:
                console.log("columnTypeToAnnotationType: default case");
                console.log(columnType);
                return AnnotationType.STRING;
        }
    }

    /**
     * Fetch all annotations.
     */
    public async fetchAnnotations(): Promise<Annotation[]> {
        const sql = `DESCRIBE ${this.database.table}`;
        const rows = (await this.database.query(sql)) as DescribeQueryResult[];
        return rows.map(
            (row) =>
                new Annotation({
                    annotationDisplayName: row["column_name"],
                    annotationName: row["column_name"],
                    description: "",
                    type: CsvAnnotationService.columnTypeToAnnotationType(row["column_type"]),
                })
        );
    }

    /**
     * Fetch the unique values for a specific annotation.
     */
    public async fetchValues(annotation: string): Promise<AnnotationValue[]> {
        const select_key = "count_key";
        const sql = `COUNT(DISTINCT ${annotation}) AS ${select_key} FROM ${this.database.table}`;
        const rows = await this.database.query(sql);
        return rows[0][select_key].split(",").map((value) => value.trim());
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
        const annotationsInFilters = filters.reduce(
            (annotations, filter) => annotations.add(filter.name),
            new Set<string>()
        );
        const hierarchyAsFilters = hierarchy
            // Map before filter because index is important to map to the path
            .map(
                (annotation, index) =>
                    new FileFilter(annotation, index < path.length ? path[index] : null)
            )
            // Filters are more specific than hierarchy, so we don't need to include them again
            .filter((filter) => !annotationsInFilters.has(filter.name));
        const whereConditions = [...filters, ...hierarchyAsFilters].map((filter) =>
            filter.toQuerySQL()
        );
        const sql = `                                       
            SELECT DISTINCT "${hierarchy[path.length - 1]}"
            FROM ${this.database.table}                                    
            WHERE ${whereConditions.join(" AND ")}
        `;
        const rows = await this.database.query(sql);
        return rows.map((row) => row[hierarchy[path.length - 1]]);
    }

    /**
     * Fetchs annotations that can be combined with current hierarchy while still producing a non-empty
     * file set
     */
    public async fetchAvailableAnnotationsForHierarchy(annotations: string[]): Promise<string[]> {
        const sql = `
            SUMMARIZE SELECT * 
            FROM ${this.database.table}
            WHERE ${annotations.map((annotation) => `${annotation} IS NOT NULL`).join(" AND ")}
        `;
        const rows = (await this.database.query(sql)) as SummarizeQueryResult[];
        console.log(`fetchAvailableAnnotationsForHierarchy: ${rows}`);
        return rows.reduce((annotations, row) => {
            const annotation = row["column_name"];
            if (row["null_percentage"] !== "100.0%") {
                annotations.push(annotation);
            }
            return annotations;
        }, [] as string[]);
    }
}
