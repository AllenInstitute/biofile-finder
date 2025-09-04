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
import IncludeFilter from "../../../entity/FileFilter/IncludeFilter";
import ExcludeFilter from "../../../entity/FileFilter/ExcludeFilter";
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

    private getSelectionSql(annotations: string[], selections: Selection[]): string {
        const sqlBuilder = new SQLBuilder()
            .select(annotations.map((annotation) => `"${annotation}"`).join(", "))
            .from(this.dataSourceNames);
        DatabaseFileService.applySelectionFilters(sqlBuilder, selections, this.dataSourceNames);
        return sqlBuilder.toSQL();
    }

    public async getManifest(
        annotations: string[],
        selections: Selection[],
        format: "csv" | "json" | "parquet"
    ): Promise<File> {
        if (format !== "csv") {
            throw new Error(
                "Only CSV manifest is supported at this time for downloading from Database"
            );
        }
        const sql = this.getSelectionSql(annotations, selections);
        const buffer = await this.databaseService.saveQuery(uniqueId(), sql, format);
        // ISOString is `YYYY-MM-DDTHH:mm:ss.sssZ`
        const dateTime = new Date().toISOString().replaceAll(":", "-");
        const name = `file-manifest-${dateTime}.${format}`;
        return new File([new Uint8Array(buffer)], name, { type: `text/${format}` });
    }

    /**
     * Download file selection as a file in the specified format.
     */
    public async download(
        annotations: string[],
        selections: Selection[],
        format: "csv" | "json" | "parquet"
    ): Promise<DownloadResult> {
        return this.handleFileDownload(this.getSelectionSql(annotations, selections), format);
    }

    /**
     * Processes selections and applies WHERE clause directly to the SQLBuilder.
     */
    public static applySelectionFilters(
        sqlBuilder: SQLBuilder,
        selections: Selection[],
        dataSourceNames: string[]
    ): void {
        const subQueries: string[] = [];

        selections.forEach((selection) => {
            selection.indexRanges.forEach((indexRange) => {
                const subQuery = new SQLBuilder()
                    .select(`${DatabaseService.HIDDEN_UID_ANNOTATION}`)
                    .from(dataSourceNames)
                    .offset(indexRange.start)
                    .limit(indexRange.end - indexRange.start + 1);

                DatabaseFileService.applyFiltersAndSorting(subQuery, selection);
                subQueries.push(
                    `${DatabaseService.HIDDEN_UID_ANNOTATION} IN (${subQuery.toSQL()})`
                );
            });
        });
        // sqlBuilder whereOr isnt implemented, so we add our own "OR"
        sqlBuilder.where(subQueries.join(" OR "));
    }

    /**
     * Applies filters and sorting to a query. ie Column names, if none then use annotationName
     */
    public static applyFiltersAndSorting(subQuery: SQLBuilder, selection: Selection): void {
        if (!isEmpty(selection.filters)) {
            subQuery.where(
                Object.entries(selection.filters).flatMap(([column, values]) =>
                    values.map((v) => SQLBuilder.regexMatchValueInList(column, v)).join(" OR ")
                )
            );
        }
        if (selection.include && selection.include.length > 0) {
            subQuery.where(
                selection.include
                    .map((annotationName) => new IncludeFilter(annotationName).toSQLWhereString())
                    .join(" AND ")
            );
        }
        if (selection.exclude && selection.exclude.length > 0) {
            subQuery.where(
                selection.exclude
                    .map((annotationName) => new ExcludeFilter(annotationName).toSQLWhereString())
                    .join(" AND ")
            );
        }
        if (selection.sort) {
            subQuery.orderBy(
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
        // If the file system is accessible we can just have DuckDB write the
        // output query directly to the system rather than to a buffer then the file
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

    public editFile(fileId: string, annotations: AnnotationNameToValuesMap): Promise<void> {
        const tableName = this.dataSourceNames.sort().join(", ");
        const columnAssignments = Object.entries(annotations).map(([name, values]) => {
            let valueString = `'${values.join(DatabaseService.LIST_DELIMITER)}'`;
            if (values.length === 0) valueString = "NULL"; // Empty value array means deletion
            return `"${name}" = ${valueString}`;
        });
        const sql = `\
            UPDATE '${tableName}' \
            SET ${columnAssignments.join(", ")} \
            WHERE ${DatabaseService.HIDDEN_UID_ANNOTATION} = '${fileId}'; \
        `;
        return this.databaseService.execute(sql);
    }
}
