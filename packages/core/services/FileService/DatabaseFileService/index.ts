import { isNil, omit, uniqueId } from "lodash";

import FileService, { GetFilesRequest, SelectionAggregationResult, Selection } from "..";
import DatabaseService from "../../DatabaseService";
import DatabaseServiceNoop from "../../DatabaseService/DatabaseServiceNoop";
import FileDownloadService, { DownloadResolution, DownloadResult } from "../../FileDownloadService";
import FileDownloadServiceNoop from "../../FileDownloadService/FileDownloadServiceNoop";
import FileSelection from "../../../entity/FileSelection";
import FileSet from "../../../entity/FileSet";
import FileDetail from "../../../entity/FileDetail";
import SQLBuilder from "../../../entity/SQLBuilder";

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
        rowNumber: number
    ): FileDetail {
        const filePath = row["File Path"];
        if (!filePath) {
            throw new Error('"File Path" (case-sensitive) is a required column for data sources');
        }

        const annotations = [];
        annotations.push({ name: "File Path", values: [filePath] });
        const fileName =
            row["File Name"] || filePath.split("\\").pop()?.split("/").pop() || filePath;
        annotations.push({ name: "File Name", values: [fileName] });
        annotations.push({ name: "File ID", values: [row["File ID"] || `${rowNumber}`] });
        if (!isNil(row["File Size"])) {
            annotations.push({ name: "File Size", values: [row["File Size"]] });
        }
        if (row["Thumbnail"]) {
            annotations.push({ name: "Thumbnail", values: [row["Thumbnail"]] });
        }
        if (row["Uploaded"]) {
            annotations.push({ name: "Uploaded", values: [row["Uploaded"]] });
        }
        return new FileDetail({
            annotations: [
                ...annotations,
                ...Object.entries(omit(row, ...annotations.keys())).flatMap(([name, values]: any) =>
                    values !== null
                        ? [
                              {
                                  name,
                                  values: `${values}`
                                      .split(DatabaseService.LIST_DELIMETER)
                                      .map((value: string) => value.trim()),
                              },
                          ]
                        : []
                ),
            ],
        });
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
        const sql = request.fileSet
            .toQuerySQLBuilder()
            .from(this.dataSourceNames)
            .offset(request.from * request.limit)
            .limit(request.limit)
            .toSQL();

        const rows = await this.databaseService.query(sql);
        return rows.map((row, index) =>
            DatabaseFileService.convertDatabaseRowToFileDetail(
                row,
                index + request.from * request.limit
            )
        );
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

        selections.forEach((selection) => {
            selection.indexRanges.forEach((indexRange) => {
                const subQuery = new SQLBuilder()
                    .select('"File Path"')
                    .from(this.dataSourceNames)
                    .where(
                        Object.entries(selection.filters)
                            .flatMap(([column, values]) =>
                                values.map(
                                    (value) =>
                                        `REGEXP_MATCHES("${column}", '(\\b${value}\\b)') = true`
                                )
                            )
                            .join(") OR (")
                    )
                    .offset(indexRange.start)
                    .limit(indexRange.end - indexRange.start + 1);

                if (selection.sort) {
                    subQuery.orderBy(
                        `"${selection.sort.annotationName}" ${
                            selection.sort.ascending ? "ASC" : "DESC"
                        }`
                    );
                }

                sqlBuilder.whereOr(`"File Path" IN (${subQuery.toSQL()})`);
            });
        });

        // If the file system is accessible we can just have DuckDB write the
        // output query directly to the system rather than to a buffer then the file
        if (this.downloadService.isFileSystemAccessible) {
            const downloadDir = await this.downloadService.getDefaultDownloadDirectory();
            const lowerCaseUserAgent = navigator.userAgent.toLowerCase();
            const separator = lowerCaseUserAgent.includes("Windows") ? "\\" : "/";
            const destination = `${downloadDir}${separator}file-selection-${Date.now().toLocaleString(
                "en-us"
            )}`;
            await this.databaseService.saveQuery(destination, sqlBuilder.toSQL(), format);
            return {
                downloadRequestId: uniqueId(),
                msg: `File downloaded to ${destination}.${format}`,
                resolution: DownloadResolution.SUCCESS,
            };
        }

        const buffer = await this.databaseService.saveQuery(uniqueId(), sqlBuilder.toSQL(), format);
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
