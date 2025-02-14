import { isEmpty, isNil, uniqueId } from "lodash";

import FileService, { GetFilesRequest, SelectionAggregationResult, Selection } from "..";
import DatabaseService from "../../DatabaseService";
import DatabaseServiceNoop from "../../DatabaseService/DatabaseServiceNoop";
import FileDownloadService, { DownloadResolution, DownloadResult } from "../../FileDownloadService";
import FileDownloadServiceNoop from "../../FileDownloadService/FileDownloadServiceNoop";
import FileSelection from "../../../entity/FileSelection";
import FileSet from "../../../entity/FileSet";
import FileDetail from "../../../entity/FileDetail";
import SQLBuilder from "../../../entity/SQLBuilder";
import { Environment } from "../../../constants";

interface Config {
    databaseService: DatabaseService;
    dataSourceNames: string[];
    downloadService: FileDownloadService;
}

/**
 * Service responsible for fetching file related metadata directly from a database.
 */
export default class DatabaseFileService implements FileService {
    private readonly databaseService: DatabaseService;
    private readonly downloadService: FileDownloadService;
    private readonly dataSourceNames: string[];

    private static convertDatabaseRowToFileDetail(
        row: { [key: string]: string },
        env: Environment
    ): FileDetail {
        const uniqueId: string | undefined = row[DatabaseService.HIDDEN_UID_ANNOTATION];
        if (!uniqueId) {
            throw new Error("Missing auto-generated unique ID");
        }

        return new FileDetail(
            {
                annotations: Object.entries(row)
                    .filter(
                        ([name, values]) =>
                            !isNil(values) &&
                            // Omit hidden UID annotation
                            name !== DatabaseService.HIDDEN_UID_ANNOTATION
                    )
                    .map(([name, values]) => ({
                        name,
                        values: `${values}`
                            .split(DatabaseService.LIST_DELIMITER)
                            .map((value: string) => value.trim()),
                    })),
            },
            env,
            uniqueId
        );
    }

    constructor(
        config: Config = {
            dataSourceNames: [],
            databaseService: new DatabaseServiceNoop(),
            downloadService: new FileDownloadServiceNoop(),
        }
    ) {
        this.databaseService = config.databaseService;
        this.downloadService = config.downloadService;
        this.dataSourceNames = config.dataSourceNames;
    }

    public async getCountOfMatchingFiles(fileSet: FileSet): Promise<number> {
        if (!this.dataSourceNames.length) {
            throw new Error("Data source is not prepared");
        }

        const select_key = "num_files";
        const sql = fileSet
            .toQuerySQLBuilder()
            .select(`COUNT(*) AS ${select_key}`)
            .from(this.dataSourceNames)
            // Remove sort if present
            .orderBy()
            .toSQL();

        const rows = await this.databaseService.query(sql);
        return parseInt(rows[0][select_key], 10);
    }

    public async getAggregateInformation(
        fileSelection: FileSelection
    ): Promise<SelectionAggregationResult> {
        const allFiles = await fileSelection.fetchAllDetails();
        const count = fileSelection.count();
        if (allFiles.length && allFiles[0].size === undefined) {
            return { count };
        }
        const size = allFiles.reduce((acc, file) => acc + (file.size || 0), 0);
        return { count, size };
    }

    /**
     * Get list of file documents that match a given filter, potentially according to a particular sort order,
     * and potentially starting from a particular file_id and limited to a set number of files.
     */
    public async getFiles(request: GetFilesRequest): Promise<FileDetail[]> {
        if (!this.dataSourceNames.length) {
            return [];
        }

        const sql = request.fileSet
            .toQuerySQLBuilder()
            .from(this.dataSourceNames)
            .offset(request.from * request.limit)
            .limit(request.limit)
            .toSQL();

        const rows = await this.databaseService.query(sql);
        const env = this.downloadService.getEnvironmentFromUrl();
        return rows.map((row) => DatabaseFileService.convertDatabaseRowToFileDetail(row, env));
    }

    /**
     * Download file selection as a file in the specified format.
     */
    public async download(
        annotations: string[],
        selections: Selection[],
        format: "csv" | "json" | "parquet"
    ): Promise<DownloadResult> {
        const sqlBuilder = new SQLBuilder()
            .select(annotations.map((annotation) => `"${annotation}"`).join(", "))
            .from(this.dataSourceNames);

        this.applySelectionFilters(sqlBuilder, selections);

        return this.handleFileDownload(sqlBuilder.toSQL(), format);
    }

    /**
     * Processes selections and applies WHERE clause directly to the SQLBuilder.
     */
    private applySelectionFilters(sqlBuilder: SQLBuilder, selections: Selection[]): void {
        const uidConditions: string[] = [];

        for (const selection of selections) {
            const selectionUIDs: string[] = [];

            for (const indexRange of selection.indexRanges) {
                const subQuery = new SQLBuilder()
                    .select(`${DatabaseService.HIDDEN_UID_ANNOTATION}`)
                    .from(this.dataSourceNames)
                    .offset(indexRange.start)
                    .limit(indexRange.end - indexRange.start + 1);

                this.applyFiltersAndSorting(subQuery, selection);

                if (indexRange.start === indexRange.end) {
                    selectionUIDs.push(`(${subQuery.toSQL()})`);
                } else {
                    uidConditions.push(
                        `${DatabaseService.HIDDEN_UID_ANNOTATION} IN (${subQuery.toSQL()})`
                    );
                }
            }

            if (selectionUIDs.length > 0) {
                uidConditions.push(
                    `${DatabaseService.HIDDEN_UID_ANNOTATION} IN (${selectionUIDs.join(", ")})`
                );
            }
        }

        if (uidConditions.length > 0) {
            sqlBuilder.whereOr(uidConditions.join(" OR "));
        }
    }

    /**
     * Applies filters and sorting to a query.
     */
    private applyFiltersAndSorting(query: SQLBuilder, selection: Selection): void {
        if (!isEmpty(selection.filters)) {
            query.where(
                Object.entries(selection.filters)
                    .flatMap(([column, values]) =>
                        values.map((v) => SQLBuilder.regexMatchValueInList(column, v))
                    )
                    .join(") OR (")
            );
        }

        if (selection.sort) {
            query.orderBy(
                `"${selection.sort.annotationName}" ${selection.sort.ascending ? "ASC" : "DESC"}`
            );
        }
    }

    /**
     * Handles file download logic.
     */
    private async handleFileDownload(
        sql: string,
        format: "csv" | "json" | "parquet"
    ): Promise<DownloadResult> {
        if (this.downloadService.isFileSystemAccessible) {
            const downloadDir = await this.downloadService.getDefaultDownloadDirectory();
            const separator = navigator.userAgent.toLowerCase().includes("windows") ? "\\" : "/";
            const destination = `${downloadDir}${separator}file-selection-${Date.now().toLocaleString(
                "en-us"
            )}`;
            await this.databaseService.saveQuery(destination, sql, format);
            return {
                downloadRequestId: uniqueId(),
                msg: `File downloaded to ${destination}.${format}`,
                resolution: DownloadResolution.SUCCESS,
            };
        }

        const buffer = await this.databaseService.saveQuery(uniqueId(), sql, format);
        const name = `file-selection-${new Date()}.${format}`;
        return this.downloadService.download(
            {
                id: name,
                name: name,
                path: name,
                data: buffer,
            },
            uniqueId()
        );
    }
}
