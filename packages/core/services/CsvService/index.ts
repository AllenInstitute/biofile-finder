import DatabaseService from "../DatabaseService";
import FileDownloadService, { DownloadResolution, DownloadResult } from "../FileDownloadService";
import { Selection } from "../FileService/HttpFileService";
import ExecutionEnvService, { ExecutableEnvCancellationToken } from "../ExecutionEnvService";
import HttpServiceBase, { ConnectionConfig } from "../HttpServiceBase";

interface CsvServiceConfig extends ConnectionConfig {
    databaseService: DatabaseService;
    downloadService: FileDownloadService;
    executionEnvService: ExecutionEnvService;
}

export interface CsvManifestRequest {
    annotations: string[];
    selections: Selection[];
}

/**
 * Service responsible for requesting a CSV manifest of metadata for selected files. Delegates
 * heavy-lifting of the downloading to a platform-dependent implementation of the FileDownloadService.
 */
export default class CsvService extends HttpServiceBase {
    private static readonly ENDPOINT_VERSION = "2.0";
    public static readonly BASE_CSV_DOWNLOAD_URL = `file-explorer-service/${CsvService.ENDPOINT_VERSION}/files/selection/manifest`;
    private readonly databaseService: DatabaseService;
    private readonly downloadService: FileDownloadService;
    private readonly executionEnvSerivce: ExecutionEnvService;

    public constructor(config: CsvServiceConfig) {
        super(config);
        this.databaseService = config.databaseService;
        this.downloadService = config.downloadService;
        this.executionEnvSerivce = config.executionEnvService;
    }

    // TODO: This division between "server" and "database" is yucky,
    // Instead, this should be driven by the Browser/Electron division and likely
    // removed entirely from this service
    public async downloadCsvFromServer(
        selectionRequest: CsvManifestRequest,
        manifestDownloadId: string
    ): Promise<DownloadResult> {
        const stringifiedPostBody = JSON.stringify(selectionRequest);
        const url = `${this.baseUrl}/${CsvService.BASE_CSV_DOWNLOAD_URL}${this.pathSuffix}`;
        return this.downloadService.downloadCsvManifest(
            url,
            stringifiedPostBody,
            manifestDownloadId
        );
    }

    public async downloadCsvFromDatabase(
        selectionRequest: CsvManifestRequest,
        manifestDownloadId: string
    ): Promise<DownloadResult> {
        const { saveLocation, fileName } = await this.executionEnvSerivce.promptForSaveLocation();
        if (saveLocation === ExecutableEnvCancellationToken) {
            return {
                downloadRequestId: manifestDownloadId,
                msg: `Cancelled download`,
                resolution: DownloadResolution.CANCELLED,
            };
        }

        const annotationsAsSelect = selectionRequest.annotations
            .map((annotation) => `"${annotation}"`)
            .join(", ");

        // TODO: Clean this up, perhaps modularize clause builders
        const rowNumberKey = "row_number";
        const subQueries = selectionRequest.selections.map((selection) => {
            const numberRangeAsWhereConditions = selection.indexRanges.map(
                (indexRange) =>
                    `"${rowNumberKey}" BETWEEN ${indexRange.start} AND ${indexRange.end}`
            );

            const columnNames = Object.keys(selection.filters);
            const filtersAsWhereConditions = columnNames.map((columnName) =>
                selection.filters[columnName]
                    .map((columnValue) => `"${columnName}" = '${columnValue}'`)
                    .join(" OR ")
            );

            const orderByCondition =
                selection.sort &&
                `"${selection.sort.annotationName}" ${selection.sort.ascending ? "ASC" : "DESC"}`;
            const orderByClause = orderByCondition ? `ORDER BY ${orderByCondition}` : "";
            return `
                SELECT "file_path"
                FROM (
                    SELECT ROW_NUMBER() OVER (${orderByClause}) AS "${rowNumberKey}", "file_path"
                    FROM ${this.databaseService.table}
                    ${
                        filtersAsWhereConditions.length
                            ? `WHERE (${filtersAsWhereConditions.join(") AND (")})`
                            : ""
                    }
                ) AS Row
                WHERE (${numberRangeAsWhereConditions.join(") OR (")})
                ${orderByClause}
            `;
        }, [] as string[]);

        // TODO: Make this more flexible to allow outputting as various types (at least parquet, json
        // TODO: See if possible to make cancellable
        const sql = `
            COPY (
                SELECT ${annotationsAsSelect}
                FROM ${this.databaseService.table} 
                WHERE "file_path" IN (
                    ${subQueries.join(") OR (")}
                )
            )
            TO '${saveLocation}' (HEADER, DELIMITER ',');
        `;

        await this.databaseService.query(sql);
        return {
            downloadRequestId: manifestDownloadId,
            msg: `${fileName} downloaded to ${saveLocation}`,
            resolution: DownloadResolution.SUCCESS,
        };
    }
}
