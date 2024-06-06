import { AICS_FMS_DATA_SOURCE_NAME } from "../../constants";
import Annotation from "../../entity/Annotation";
import { AnnotationType } from "../../entity/AnnotationFormatter";
import { Source } from "../../entity/FileExplorerURL";
import SQLBuilder from "../../entity/SQLBuilder";

/**
 * Service reponsible for querying against a database
 */
export default abstract class DatabaseService {
    private currentAggregateSource?: string;
    // Initialize with AICS FMS data source name to pretend it always exists
    protected readonly existingDataSources = new Set([AICS_FMS_DATA_SOURCE_NAME]);

    public abstract saveQuery(
        _destination: string,
        _sql: string,
        _format: "csv" | "parquet" | "json"
    ): Promise<Uint8Array>;

    public abstract query(_sql: string): Promise<{ [key: string]: string }[]>;

    protected abstract addDataSource(_dataSource: Source): Promise<void>;

    protected abstract execute(_sql: string): Promise<void>;

    private static columnTypeToAnnotationType(columnType: string): string {
        switch (columnType) {
            case "INTEGER":
            case "BIGINT":
            // TODO: Add support for column types
            // https://github.com/AllenInstitute/aics-fms-file-explorer-app/issues/60
            // return AnnotationType.NUMBER;
            case "VARCHAR":
            case "TEXT":
            default:
                return AnnotationType.STRING;
        }
    }

    constructor() {
        // 'this' scope gets lost when a higher order class (ex. DatabaseService)
        // calls a lower level class (ex. DatabaseServiceWeb)
        this.addDataSource = this.addDataSource.bind(this);
        this.execute = this.execute.bind(this);
        this.query = this.query.bind(this);
    }

    public async prepareDataSources(dataSources: Source[]): Promise<void> {
        await Promise.all(dataSources.map(this.addDataSource));

        // Because when querying multiple data sources column differences can complicate the queries
        // preparing a table ahead of time that is the aggregate of the data sources is most optimal
        // should look toward some way of reducing the memory footprint if that becomes an issue
        if (dataSources.length > 1) {
            await this.aggregateDataSources(dataSources);
        }
    }

    protected async deleteDataSource(dataSource: string): Promise<void> {
        this.existingDataSources.delete(dataSource);
        await this.execute(`DROP TABLE IF EXISTS "${dataSource}"`);
    }

    private async aggregateDataSources(dataSources: Source[]): Promise<void> {
        const viewName = dataSources.sort().join(", ");

        if (this.currentAggregateSource) {
            // Prevent adding the same data source multiple times by shortcutting out here
            if (this.currentAggregateSource === viewName) {
                return;
            }

            // Otherwise, if an old aggregate exists, delete it
            await this.deleteDataSource(this.currentAggregateSource);
        }

        const columnsSoFar = new Set<string>();
        for (const dataSource of dataSources) {
            // Fetch information about this data source
            const annotationsInDataSource = await this.fetchAnnotations([dataSource.name]);
            const columnsInDataSource = annotationsInDataSource.map(
                (annotation) => annotation.name
            );
            const newColumns = columnsInDataSource.filter((column) => !columnsSoFar.has(column));

            // If there are no columns / data added yet we need to create the table from
            // scratch so we can provide an easy shortcut around the default way of adding
            // data to a table
            if (columnsSoFar.size === 0) {
                await this.execute(`CREATE TABLE "${viewName}" AS SELECT * FROM "${dataSource}"`);
                this.currentAggregateSource = viewName;
            } else {
                // If adding data to an existing table we will need to add any new columns
                if (newColumns.length) {
                    await this.execute(`
                        ALTER TABLE "${viewName}"
                        ADD ${newColumns.map((c) => `"${c}" VARCHAR`).join(", ")}
                    `);
                }

                // After we have added any new columns to the table schema we just need
                // to insert the data from the new table to this table replacing any non-existent
                // columns with an empty value (null)
                const columnsSoFarArr = [...columnsSoFar, ...newColumns];
                await this.execute(`
                    INSERT INTO "${viewName}" ("${columnsSoFarArr.join('", "')}")
                    SELECT ${columnsSoFarArr
                        .map((column) =>
                            columnsInDataSource.includes(column) ? `"${column}"` : "NULL"
                        )
                        .join(", ")}
                    FROM "${dataSource}"
                `);
            }

            // Add the new columns from this data source to the existing columns
            // to avoid adding duplicate columns
            newColumns.forEach((column) => columnsSoFar.add(column));
        }
    }

    public async fetchAnnotations(dataSourceNames: string[]): Promise<Annotation[]> {
        const sql = new SQLBuilder()
            .from('information_schema"."columns')
            .where(`table_name = '${dataSourceNames.sort().join("', '")}'`)
            .toSQL();
        const rows = await this.query(sql);
        return rows.map(
            (row) =>
                new Annotation({
                    annotationDisplayName: row["column_name"],
                    annotationName: row["column_name"],
                    description: "",
                    type: DatabaseService.columnTypeToAnnotationType(row["data_type"]),
                })
        );
    }
}
