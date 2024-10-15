import { isEmpty, isNil, uniqueId } from "lodash";

import FileService, {
    GetFilesRequest,
    SelectionAggregationResult,
    Selection,
    AnnotationNameToValuesMap,
} from "..";
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

    private static convertDatabaseRowToFileDetail(row: { [key: string]: string }): FileDetail {
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
        return rows.map(DatabaseFileService.convertDatabaseRowToFileDetail);
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
                    .select(`${DatabaseService.HIDDEN_UID_ANNOTATION}`)
                    .from(this.dataSourceNames)
                    .offset(indexRange.start)
                    .limit(indexRange.end - indexRange.start + 1);

                if (!isEmpty(selection.filters)) {
                    subQuery.where(
                        Object.entries(selection.filters)
                            .flatMap(([column, values]) =>
                                values.map((v) => SQLBuilder.regexMatchValueInList(column, v))
                            )
                            .join(") OR (")
                    );
                }
                if (selection.sort) {
                    subQuery.orderBy(
                        `"${selection.sort.annotationName}" ${
                            selection.sort.ascending ? "ASC" : "DESC"
                        }`
                    );
                }

                sqlBuilder.whereOr(
                    `${DatabaseService.HIDDEN_UID_ANNOTATION} IN (${subQuery.toSQL()})`
                );
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

    public editFile(fileId: string, annotations: AnnotationNameToValuesMap): Promise<void> {
        const tableName = this.dataSourceNames.sort().join(", ");
        const columnAssignments = Object.entries(annotations).map(
            ([name, values]) => `${name} = ${values.join(DatabaseService.LIST_DELIMITER)}`
        );
        const sql = `\
            UPDATE ${tableName} \
            SET ${columnAssignments.join(", ")} \
            WHERE FileId = ${fileId}; \
        `;
        return this.databaseService.execute(sql);
    }

    public async getEditableFileMetadata(
        fileIds: string[]
    ): Promise<{ [fileId: string]: AnnotationNameToValuesMap }> {
        const sql = new SQLBuilder()
            .from(this.dataSourceNames)
            .where(`"File ID" IN (${fileIds.join(", ")})`)
            .toSQL();

        const rows = await this.databaseService.query(sql);
        return rows
            .map((row) => DatabaseFileService.convertDatabaseRowToFileDetail(row, 0))
            .reduce(
                (acc, file) => ({
                    ...acc,
                    [file.id]: file.annotations.reduce(
                        (annoAcc, annotation) => ({
                            ...annoAcc,
                            [annotation.name]: annotation.values,
                        }),
                        {} as AnnotationNameToValuesMap
                    ),
                }),
                {} as { [fileId: string]: AnnotationNameToValuesMap }
            );
    }
}
