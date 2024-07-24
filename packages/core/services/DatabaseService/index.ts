import { isEmpty } from "lodash";

import { AICS_FMS_DATA_SOURCE_NAME } from "../../constants";
import Annotation from "../../entity/Annotation";
import { AnnotationType } from "../../entity/AnnotationFormatter";
import { Source } from "../../entity/FileExplorerURL";
import SQLBuilder from "../../entity/SQLBuilder";

/**
 * Service reponsible for querying against a database
 */
export default abstract class DatabaseService {
    protected readonly SOURCE_METADATA_TABLE = "source_metadata";

    private currentAggregateSource?: string;
    // Initialize with AICS FMS data source name to pretend it always exists
    protected readonly existingDataSources = new Set([AICS_FMS_DATA_SOURCE_NAME]);
    private readonly dataSourceToAnnotationsMap: Map<string, Annotation[]> = new Map();

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

    public async prepareSourceMetadata(sourceMetadata: Source): Promise<void> {
        await this.deleteSourceMetadata();

        await this.addDataSource({
            ...sourceMetadata,
            name: this.SOURCE_METADATA_TABLE,
        });
    }

    protected async deleteDataSource(dataSource: string): Promise<void> {
        this.existingDataSources.delete(dataSource);
        this.dataSourceToAnnotationsMap.delete(dataSource);
        await this.execute(`DROP TABLE IF EXISTS "${dataSource}"`);
    }

    protected async deleteSourceMetadata(): Promise<void> {
        this.deleteDataSource(this.SOURCE_METADATA_TABLE);
        this.dataSourceToAnnotationsMap.clear();
    }

    private async aggregateDataSources(dataSources: Source[]): Promise<void> {
        const viewName = dataSources
            .map((source) => source.name)
            .sort()
            .join(", ");

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
                await this.execute(
                    `CREATE TABLE "${viewName}" AS SELECT *, '${dataSource.name}' AS "Data source" FROM "${dataSource.name}"`
                );
                this.currentAggregateSource = viewName;
            } else {
                // If adding data to an existing table we will need to add any new columns
                // unsure why but seemingly unable to add multiple columns in one alter table
                // statement so we will need to loop through and add them one by one
                if (newColumns.length) {
                    const alterTableSQL = newColumns
                        .map((column) => `ALTER TABLE "${viewName}" ADD COLUMN "${column}" VARCHAR`)
                        .join("; ");
                    await this.execute(alterTableSQL);
                }

                // After we have added any new columns to the table schema we just need
                // to insert the data from the new table to this table replacing any non-existent
                // columns with an empty value (null)
                const columnsSoFarArr = [...columnsSoFar, ...newColumns];
                await this.execute(`
                    INSERT INTO "${viewName}" ("${columnsSoFarArr.join('", "')}", "Data source")
                    SELECT ${columnsSoFarArr
                        .map((column) =>
                            columnsInDataSource.includes(column) ? `"${column}"` : "NULL"
                        )
                        .join(", ")}, '${dataSource.name}' AS "Data source"
                    FROM "${dataSource.name}"
                `);
            }

            // Add the new columns from this data source to the existing columns
            // to avoid adding duplicate columns
            newColumns.forEach((column) => columnsSoFar.add(column));
        }
    }

    public async fetchAnnotations(dataSourceNames: string[]): Promise<Annotation[]> {
        const aggregateDataSourceName = dataSourceNames.sort().join(", ");
        if (!this.dataSourceToAnnotationsMap.has(aggregateDataSourceName)) {
            const sql = new SQLBuilder()
                .from('information_schema"."columns')
                .where(`table_name = '${aggregateDataSourceName}'`)
                .toSQL();
            const rows = await this.query(sql);
            if (isEmpty(rows)) {
                throw new Error(`Unable to fetch annotations for ${aggregateDataSourceName}`);
            }
            const annotationNameToDescriptionMap = await this.fetchAnnotationDescriptions();
            const annotations = rows.map(
                (row) =>
                    new Annotation({
                        annotationDisplayName: row["column_name"],
                        annotationName: row["column_name"],
                        description: annotationNameToDescriptionMap[row["column_name"]] || "",
                        type: DatabaseService.columnTypeToAnnotationType(row["data_type"]),
                    })
            );
            this.dataSourceToAnnotationsMap.set(aggregateDataSourceName, annotations);
        }

        return this.dataSourceToAnnotationsMap.get(aggregateDataSourceName) || [];
    }

    private async fetchAnnotationDescriptions(): Promise<Record<string, string>> {
        const sql = new SQLBuilder()
            .select('"Column Name", "Description"')
            .from(this.SOURCE_METADATA_TABLE)
            .toSQL();
        try {
            const rows = await this.query(sql);
            return rows.reduce(
                (map, row) => ({ ...map, [row["Column Name"]]: row["Description"] }),
                {}
            );
        } catch (err) {
            // Source metadata file may not have been supplied
            if ((err as Error).message.includes("does not exist")) {
                return {};
            }
            throw err;
        }
    }
}
