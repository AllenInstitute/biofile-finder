import axios from "axios";
import { isEmpty, mapKeys } from "lodash";

import { columnTypeToAnnotationType, getUpdateHiddenUIDSQL } from "./utils";
import { AICS_FMS_DATA_SOURCE_NAME } from "../../constants";
import Annotation from "../../entity/Annotation";
import { AnnotationType } from "../../entity/AnnotationFormatter";
import { EdgeDefinition } from "../../entity/Graph";
import { Source } from "../../entity/SearchParams";
import SQLBuilder from "../../entity/SQLBuilder";
import DataSourcePreparationError from "../../errors/DataSourcePreparationError";

/**
 * Service reponsible for querying against a database
 */
export default abstract class DatabaseService {
    public static readonly LIST_DELIMITER = ",";
    // Name of the hidden column BFF uses to uniquely identify rows
    public static readonly HIDDEN_UID_ANNOTATION = "hidden_bff_uid";
    // protected static readonly RAW_SUFFIX = "__bff_raw";
    protected readonly SOURCE_METADATA_TABLE = "source_metadata";
    protected readonly SOURCE_PROVENANCE_TABLE = "source_provenance";
    protected static readonly ANNOTATION_TYPE_SET = new Set(Object.values(AnnotationType));
    protected sourceMetadataName?: string;
    public sourceProvenanceName?: string;
    private currentAggregateSource?: string;
    // Initialize with AICS FMS data source name to pretend it always exists
    protected readonly existingDataSources = new Set([AICS_FMS_DATA_SOURCE_NAME]);
    protected readonly dataSourceToAnnotationsMap: Map<string, Annotation[]> = new Map();
    protected readonly dataSourceToProvenanceMap: Map<string, EdgeDefinition[]> = new Map();
    // Data source names that are views (parquet), so we DROP VIEW on delete
    protected readonly parquetDirectViewNames = new Set<string>();

    constructor() {
        this.execute = this.execute.bind(this);
        this.query = this.query.bind(this);
    }

    public abstract saveQuery(
        destination: string,
        sql: string,
        format: "parquet" | "csv" | "json"
    ): Promise<Uint8Array>;

    public abstract query(
        sql: string
    ): { promise: Promise<{ [key: string]: any }[]>; cancel?: (reason?: string) => void };

    public abstract close(): void;

    public abstract execute(sql: string): Promise<void>;

    public hasDataSource(dataSourceName: string): boolean {
        return this.existingDataSources.has(dataSourceName);
    }

    public async prepareDataSources(
        dataSources: Source[],
        skipNormalization = false
    ): Promise<void> {
        const pending: Promise<any>[] = [];
        dataSources
            .filter((dataSource) => !this.hasDataSource(dataSource.name))
            .map((dataSource) => {
                const promise = this.prepareDataSourceWrapper(dataSource, skipNormalization);
                pending.push(promise);
            });
        await Promise.all(pending);

        // Because when querying multiple data sources column differences can complicate the queries
        // preparing a table ahead of time that is the aggregate of the data sources is most optimal
        // should look toward some way of reducing the memory footprint if that becomes an issue
        if (dataSources.length > 1) {
            await this.aggregateDataSources(dataSources);
        }
    }

    private async prepareDataSourceWrapper(
        dataSource: Source,
        skipNormalization: boolean
    ): Promise<void> {
        const { name, type, uri } = dataSource;

        if (!type || !uri) {
            throw new DataSourcePreparationError(
                `Lost access to the data source.\
                </br> \
                Local data sources must be re-uploaded with each \
                page refresh to gain access to the data source file \
                on your computer. \
                To avoid this, consider using cloud storage for the \
                file and sharing the URL.`,
                name
            );
        }

        try {
            await this.prepareDataSource(dataSource, skipNormalization);
        } catch (err) {
            let formattedError = (err as Error).message;
            // DuckDB does not provide informative server errors, so send a
            // separate 'get' call to retrieve error messages for URL data sources
            if (!(uri instanceof File)) {
                await axios.get(uri).catch((error) => {
                    // Error responses can be formatted differently
                    // Get progressively less specific in where we look for the message
                    if (error?.response) {
                        formattedError = `Request failed with status ${error.response.status}: ${
                            error.response?.data?.error ||
                            error.response?.data?.message ||
                            error.response?.statusText ||
                            error.response.data
                        }`;
                    } else if (error?.message) {
                        formattedError = error.message;
                    } // else use default error message
                });
            }
            await this.deleteDataSource(name);
            throw new DataSourcePreparationError(formattedError, name);
        }
    }

    protected abstract prepareDataSource(
        dataSource: Source,
        skipNormalization: boolean
    ): Promise<void>;

    public async prepareSourceMetadata(sourceMetadata: Source): Promise<void> {
        const isPreviousSource = sourceMetadata.name === this.sourceMetadataName;
        if (isPreviousSource) {
            return;
        }

        await this.deleteSourceMetadata();
        await this.prepareDataSourceWrapper(
            {
                ...sourceMetadata,
                name: this.SOURCE_METADATA_TABLE,
            },
            true
        );
        this.sourceMetadataName = sourceMetadata.name;
    }

    private async prepareSourceProvenance(sourceProvenance: Source): Promise<void> {
        const isPreviousSource = sourceProvenance.name === this.sourceProvenanceName;
        if (isPreviousSource) {
            return;
        }
        await this.deleteSourceProvenance();
        await this.prepareDataSourceWrapper(
            {
                ...sourceProvenance,
                name: this.SOURCE_PROVENANCE_TABLE,
            },
            true
        );
        this.sourceProvenanceName = sourceProvenance.name;
    }

    public async deleteSourceProvenance(): Promise<void> {
        if (this.sourceProvenanceName) {
            await this.deleteDataSource(this.SOURCE_PROVENANCE_TABLE);
            this.dataSourceToProvenanceMap.clear();
            this.sourceProvenanceName = undefined;
        }
    }

    public async deleteSourceMetadata(): Promise<void> {
        await this.deleteDataSource(this.SOURCE_METADATA_TABLE);
        this.dataSourceToAnnotationsMap.clear();
    }

    protected abstract deleteDataSource(dataSource: string): Promise<void>;

    private async aggregateDataSources(dataSources: Source[]): Promise<void> {
        if (dataSources.some((source) => source.type === "parquet")) {
            throw new Error("Parquet tables cannot be combined to query multiple data sources.");
        }
        const viewName = dataSources
            .map((source) => source.name)
            .sort()
            .join(", ");

        if (this.currentAggregateSource === viewName) {
            // Prevent adding the same data source multiple times by shortcutting out here
            return;
        } else if (this.currentAggregateSource) {
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

        // Reset hidden UID to avoid conflicts in previous auto-generation
        await this.execute(getUpdateHiddenUIDSQL(viewName));
    }

    public async processProvenance(provenanceSource: Source): Promise<EdgeDefinition[]> {
        await this.prepareSourceProvenance(provenanceSource);

        const sql = new SQLBuilder().select("*").from(`${this.SOURCE_PROVENANCE_TABLE}`).toSQL();
        try {
            const rows = await this.query(sql).promise;
            const parentsAndChildren = new Set<string>();
            return rows
                .map((row) =>
                    Object.keys(row).reduce(
                        (mapSoFar, key) => ({
                            ...mapSoFar,
                            [key.toLowerCase().trim()]:
                                typeof row[key] !== "object"
                                    ? row[key]
                                    : mapKeys(row[key], (_value, innerKey) =>
                                          innerKey.toLowerCase().trim()
                                      ),
                        }),
                        {} as Record<string, any>
                    )
                )
                .map((row) => {
                    try {
                        const parentAndChildKey = `${row["parent"]}-${row["child"]}`;
                        if (parentsAndChildren.has(parentAndChildKey)) {
                            throw new Error(
                                `Parent (${row["parent"]}) and Child (${row["child"]}) combination found multiple times`
                            );
                        }

                        parentsAndChildren.add(parentAndChildKey);
                        return {
                            relationship: row["relationship"],
                            relationshipType: row["relationship type"],
                            parent: {
                                name: row["parent"],
                                type: row["parent type"],
                            },
                            child: {
                                name: row["child"],
                                type: row["child type"],
                            },
                        };
                    } catch (err) {
                        if ((err as Error).message.includes("key")) {
                            throw new Error(
                                `Unexpected format for provenance data. Check the documentation
                                for what BFF expects provenance data to look like.
                                Error: ${(err as Error).message}`
                            );
                        }
                        throw err;
                    }
                });
        } catch (err) {
            // Source provenance file may not have been supplied
            // and/or the columns may not exist
            const errMsg = typeof err === "string" ? err : err instanceof Error ? err.message : "";
            if (errMsg.includes("does not exist") || errMsg.includes("not found in FROM clause")) {
                return [];
            }
            throw err;
        }
    }

    public async fetchAnnotations(dataSourceNames: string[]): Promise<Annotation[]> {
        const aggregateDataSourceName = dataSourceNames.sort().join(", ");
        const hasAnnotations = this.dataSourceToAnnotationsMap.has(aggregateDataSourceName);
        const hasDescriptions = this.dataSourceToAnnotationsMap
            .get(aggregateDataSourceName)
            ?.some((annotation) => !!annotation.description);
        const shouldHaveDescriptions = dataSourceNames.includes(this.SOURCE_METADATA_TABLE);
        if (!hasAnnotations || (!hasDescriptions && shouldHaveDescriptions)) {
            const sql = new SQLBuilder()
                .select("column_name, data_type")
                .from('information_schema"."columns')
                .where(`table_name = '${aggregateDataSourceName}'`)
                .where(`column_name != '${DatabaseService.HIDDEN_UID_ANNOTATION}'`)
                .toSQL();
            const rows = await this.query(sql).promise;
            if (isEmpty(rows)) {
                throw new Error(`Unable to fetch annotations for ${aggregateDataSourceName}`);
            }
            const [annotationNameToDescriptionMap, annotationNameToTypeMap] = await Promise.all([
                this.fetchAnnotationDescriptions(),
                this.fetchAnnotationTypes(),
            ]);

            const annotations = rows.map(
                (row) =>
                    new Annotation({
                        annotationName: row["column_name"],
                        annotationDisplayName: row["column_name"],
                        description: annotationNameToDescriptionMap[row["column_name"]] || "",
                        type:
                            (annotationNameToTypeMap[row["column_name"]] as AnnotationType) ||
                            columnTypeToAnnotationType(row["data_type"]),
                    })
            );
            this.dataSourceToAnnotationsMap.set(aggregateDataSourceName, annotations);
        }

        return this.dataSourceToAnnotationsMap.get(aggregateDataSourceName) || [];
    }

    protected async getColumnsOnDataSource(name: string): Promise<Set<string>> {
        const annotations = await this.fetchAnnotations([name]);
        return new Set(annotations.map((annotation) => annotation.name));
    }

    private async fetchAnnotationDescriptions(): Promise<Record<string, string>> {
        // Unless we have actually added the source metadata table we can't fetch the descriptions
        if (!this.existingDataSources.has(this.SOURCE_METADATA_TABLE)) {
            return {};
        }

        const sql = new SQLBuilder()
            .select('"Column Name", "Description"')
            .from(this.SOURCE_METADATA_TABLE)
            .toSQL();
        try {
            const rows = await this.query(sql).promise;
            return rows.reduce(
                (map, row) => ({ ...map, [row["Column Name"]]: row["Description"] }),
                {}
            );
        } catch (err) {
            // Source metadata file may not have been supplied
            // and/or this column may not exist
            const errMsg = typeof err === "string" ? err : err instanceof Error ? err.message : "";
            if (errMsg.includes("does not exist") || errMsg.includes("not found in FROM clause")) {
                return {};
            }
            throw err;
        }
    }

    public async fetchAnnotationTypes(): Promise<Record<string, string>> {
        // Unless we have actually added the source metadata table we can't fetch the types
        if (!this.existingDataSources.has(this.SOURCE_METADATA_TABLE)) {
            return {};
        }

        const sql = new SQLBuilder()
            .select('"Column Name", "Type"')
            .from(this.SOURCE_METADATA_TABLE)
            .toSQL();

        try {
            const rows = await this.query(sql).promise;
            return rows.reduce(
                (map, row) =>
                    DatabaseService.ANNOTATION_TYPE_SET.has(row["Type"])
                        ? { ...map, [row["Column Name"]]: row["Type"] }
                        : // Ignore row if invalid annotation type
                          map,
                {}
            );
        } catch (err) {
            // Source metadata file may not have been supplied
            // and/or this column may not exist
            const errMsg = typeof err === "string" ? err : err instanceof Error ? err.message : "";
            if (errMsg.includes("does not exist") || errMsg.includes("not found in FROM clause")) {
                return {};
            }
            throw err;
        }
    }

    // To do: unclear if this is still working
    public async addNewColumn(
        datasourceName: string,
        columnName: string,
        description?: string
    ): Promise<void> {
        await this.execute(`ALTER TABLE "${datasourceName}" ADD COLUMN "${columnName}" VARCHAR;`);

        // Cache is now invalid since we added a column
        this.dataSourceToAnnotationsMap.delete(datasourceName);

        if (description?.trim() && this.existingDataSources.has(this.SOURCE_METADATA_TABLE)) {
            await this
                .execute(`INSERT INTO "${this.SOURCE_METADATA_TABLE}" ("Column Name", "Description")
                    VALUES ('${columnName}', '${description}');`);
        }
    }
}
