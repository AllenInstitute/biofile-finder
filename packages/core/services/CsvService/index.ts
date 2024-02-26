import { DownloadResolution, DownloadResult } from "../FileDownloadService";
import { Selection } from "../FileService/HttpFileService";
import DatabaseService from "../DatabaseService";
import ExecutionEnvService, { ExecutableEnvCancellationToken } from "../ExecutionEnvService";

interface CsvServiceConfig {
    database: DatabaseService;
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
export default class CsvService {
    private readonly database: DatabaseService;
    private readonly executionEnvSerivce: ExecutionEnvService;

    public constructor(config: CsvServiceConfig) {
        this.database = config.database;
        this.executionEnvSerivce = config.executionEnvService;
    }

    public async downloadCsv(
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
        const subQueries = selectionRequest.selections.map((selection) => {
            const numberRangeAsWhereConditions = selection.indexRanges.map(
                (indexRange) => `"Number" BETWEEN ${indexRange.start} AND ${indexRange.end}`
            );

            const filterKeys = Object.keys(selection.filters);
            const filtersAsWhereConditions = filterKeys.map((filterKey) =>
                selection.filters[filterKey]
                    .map((filterValue) => `"${filterKey}" = '${filterValue}'`)
                    .join(" OR ")
            );

            const orderByCondition =
                selection.sort &&
                `"${selection.sort.annotationName}" ${selection.sort.ascending ? "ASC" : "DESC"}`;
            const orderByClause = orderByCondition ? `ORDER BY ${orderByCondition}` : "";
            return `
                SELECT "file_path"
                FROM (
                    SELECT ROW_NUMBER() OVER (${orderByClause}) AS "Number", "file_path"
                    FROM ${this.database.table}
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
        const sql = `
            COPY (
                SELECT ${annotationsAsSelect}
                FROM ${this.database.table} 
                WHERE "file_path" IN (
                    ${subQueries.join(") OR (")}
                )
            )
            TO '${saveLocation}' (HEADER, DELIMITER ',');
        `;
        console.log(`sql: ${sql}`);
        await this.database.query(sql);
        return {
            downloadRequestId: manifestDownloadId,
            msg: `${fileName} downloaded to ${saveLocation}`,
            resolution: DownloadResolution.SUCCESS,
        };
    }
}
