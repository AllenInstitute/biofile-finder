import CsvDatabaseService from "../../CsvDatabaseService";
import CsvDatabaseServiceNoop from "../../CsvDatabaseService/CsvDatabaseServiceNoop";
import { ConnectionConfig } from "../../HttpServiceBase";
import Annotation from "../../../entity/Annotation";
import FileFilter from "../../../entity/FileFilter";
import { AnnotationType } from "../../../entity/AnnotationFormatter";
import AnnotationService, { AnnotationValue } from "..";

interface CsvAnnotationServiceConfig extends ConnectionConfig {
    database: CsvDatabaseService;
}

/**
 * todo
 */
export default class CsvAnnotationService extends AnnotationService {
    private database: CsvDatabaseService;

    constructor(config: CsvAnnotationServiceConfig = { database: new CsvDatabaseServiceNoop() }) {
        super(config);
        this.database = config.database;
    }

    /**
     * Fetch all annotations.
     */
    public async fetchAnnotations(): Promise<Annotation[]> {
        const sql = "DESCRIBE new_tbl";
        const rows = await this.database.query(sql);
        return rows.map(
            (row: any) =>
                new Annotation({
                    annotationDisplayName: row["column_name"],
                    annotationName: row["column_name"],
                    description: "blah",
                    type: AnnotationType.STRING,
                })
        );
    }

    /**
     * Fetch the unique values for a specific annotation.
     */
    public async fetchValues(annotation: string): Promise<AnnotationValue[]> {
        const count_key = "count_key";
        const sql = `COUNT(DISTINCT ${annotation}) AS ${count_key} FROM new_tbl`;
        const response = await this.database.query(sql);
        return response[0][count_key].split(",").map((value) => value.trim());
    }

    public async fetchRootHierarchyValues(
        hierarchy: string[],
        filters: FileFilter[]
    ): Promise<string[]> {
        const filtersAsWhereCondition = filters.map(
            (filter) => `"${filter.name}" = '${filter.value}'`
        );
        const annotationsInFilters = filters.reduce(
            (annotations, filter) => annotations.add(filter.name),
            new Set<string>()
        );
        const hierarchyAsWhereCondition = hierarchy
            .filter((annotation) => !annotationsInFilters.has(annotation))
            .map((annotation) => `"${annotation}" IS NOT NULL`);
        const allWhereConditions = [...filtersAsWhereCondition, ...hierarchyAsWhereCondition];
        const sql = `SELECT DISTINCT "${hierarchy[0]}" FROM new_tbl WHERE ${allWhereConditions.join(
            " AND "
        )}`;
        const rows = await this.database.query(sql);
        return rows.map((row: any) => row[hierarchy[0]]);
    }

    public async fetchHierarchyValuesUnderPath(
        hierarchy: string[],
        path: string[],
        filters: FileFilter[]
    ): Promise<string[]> {
        const filtersAsWhereCondition = filters.map(
            (filter) => `${filter.name} = '${filter.value}'`
        );
        const annotationsInFilters = filters.reduce(
            (annotations, filter) => annotations.add(filter.name),
            new Set<string>()
        );
        const hierarchyAsWhereCondition = hierarchy.reduce((conditionSoFar, annotation, index) => {
            if (!annotationsInFilters.has(annotation)) {
                if (index < path.length) {
                    conditionSoFar.push(`"${annotation}" = '${path[index]}'`);
                } else {
                    conditionSoFar.push(`"${annotation}" IS NOT NULL`);
                }
            }
            return conditionSoFar;
        }, [] as string[]);
        const allWhereConditions = [...filtersAsWhereCondition, ...hierarchyAsWhereCondition];
        const sql = `SELECT DISTINCT "${
            hierarchy[path.length - 1]
        }" FROM new_tbl WHERE ${allWhereConditions.join(" AND ")}`;
        const rows = await this.database.query(sql);
        console.log(`under path`);
        console.log(rows);
        return rows.map((row: any) => row[hierarchy[path.length - 1]]);
    }

    /**
     * Fetchs annotations that can be combined with current hierarchy while still producing a non-empty
     * file set
     */
    public async fetchAvailableAnnotationsForHierarchy(annotations: string[]): Promise<string[]> {
        const allAnnotations = await this.fetchAnnotations();
        return allAnnotations
            .map((annotation) => annotation.name)
            .filter((annotation) => !annotations.includes(annotation));
    }
}
