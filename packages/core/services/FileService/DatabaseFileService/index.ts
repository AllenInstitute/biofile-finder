import { castArray, isEmpty, isNil, isObject, uniqueId } from "lodash";

import FileService, {
    GetFilesRequest,
    SelectionAggregationResult,
    Selection,
    AnnotationNameToValuesMap,
    FmsFileAnnotation,
    NestedMetadataValue,
    MetadataValue,
    PrimitiveMetadataValue,
} from "..";
import DatabaseService from "../../DatabaseService";
import DatabaseServiceNoop from "../../DatabaseService/DatabaseServiceNoop";
import FileDownloadService, { DownloadResult } from "../../FileDownloadService";
import FileDownloadServiceNoop from "../../FileDownloadService/FileDownloadServiceNoop";
import { Environment, HIDDEN_UID_ANNOTATION } from "../../../constants";
import IncludeFilter from "../../../entity/FileFilter/IncludeFilter";
import ExcludeFilter from "../../../entity/FileFilter/ExcludeFilter";
import FileSelection from "../../../entity/FileSelection";
import FileSet from "../../../entity/FileSet";
import FileDetail from "../../../entity/FileDetail";
import SQLBuilder from "../../../entity/SQLBuilder";


// Helper function to determine if a value is a nested metadata object
// (i.e., an array of objects) vs a primitive or array of primitives
function isNestedMetadata(value: any): boolean {
    // Is a single object that isn't null/undefined
    // || is array of objects that isn't empty and whose first element is an object that isn't null/undefined
    return (
        !Array.isArray(value) &&
        isObject(value) &&
        !isNil(value)
    ) || (
        Array.isArray(value) &&
        value.length > 0 &&
        isObject(value[0]) &&
        !isNil(value[0])
    )
}

/**
 * Recursively unwraps nested metadata values into a flat structure.
 * For example, a value like:
 * [
 *   {
 *     "Gene": "ABCD",
 *     "Color": "Blue,Green"
 *   },
 *   {
 *     "Size": ["Large", "Medium"],
 *     "Solution": [
 *       {
 *         "Dose": "97",
 *         "Unit": "mL"
 *       }
 *     ]
 *   }
 * ]
 */
function unwrapNestedMetadata(values: any): MetadataValue {
    // Recursive case: values is an array of nested metadata objects
    if (isNestedMetadata(values)) {
        return (castArray(values) as NestedMetadataValue[])
            .map((nestedValue) => (
                Object.entries(nestedValue)
                    .reduce((acc, [key, value]) => ({
                        ...acc,
                        [key]: unwrapNestedMetadata(value),
                    }), {} as NestedMetadataValue)
            ));
    }
    // Base case: values is a primitive or an array of primitives
    return String(values as PrimitiveMetadataValue[])
        .split(DatabaseService.LIST_DELIMITER)
        .map((value) => value.trim());
}

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
        row: { [key: string]: any },
        env: Environment
    ): FileDetail {
        const uniqueId: string | undefined = row[HIDDEN_UID_ANNOTATION];
        if (!uniqueId) {
            throw new Error("Missing auto-generated unique ID");
        }

        const annotations = Object.entries(row)
            // Filter out null/undefined values and the unique ID annotation used for selection logic
            .filter(
                ([name, values]) =>
                    !isNil(values) && name !== HIDDEN_UID_ANNOTATION
            )
            .flatMap(([name, values]): FmsFileAnnotation[] => {
                // It is possible the column is formatted as a JSON string
                // representing a nested annotation or array of annotations,
                // so we attempt to parse that if the value is a string
                if (typeof values === "string") {
                    try {
                        const parsed = JSON.parse(values);
                        if (isNestedMetadata(parsed)) {
                            return [{ name, values: unwrapNestedMetadata(parsed) }];
                        }
                    } catch {
                        // Not JSON — fall through to plain string handling
                    }
                }

                // Default case: primitive value or array of primitives,
                // potentially delimited by DatabaseService.LIST_DELIMITER
                return [{ name, values: unwrapNestedMetadata(values) }];
            });

        return new FileDetail({ annotations }, env, uniqueId);
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
        // Async DB means source may exist in query params but not in database
        const dataSourcesExistInDatabase = this.dataSourceNames.every((name) =>
            this.databaseService.hasDataSource(name)
        );
        // Make sure that if querying multiple sources, we also have the aggregate table
        const aggregateExistsInDatabase =
            this.dataSourceNames.length === 1
                ? dataSourcesExistInDatabase
                : this.databaseService.hasAggregateSource(this.dataSourceNames);
        if (
            !this.dataSourceNames.length ||
            !dataSourcesExistInDatabase ||
            !aggregateExistsInDatabase
        ) {
            throw new Error("Data source is not prepared");
        }

        const select_key = "num_files";
        const sql = fileSet
            .toQuerySQLBuilder()
            .select(`COUNT(*) AS ${select_key}`)
            .from(this.dataSourceNames)
            // Remove sort if present
            .removeOrderBy()
            .toSQL();

        const rows = await this.databaseService.query(sql).promise;
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

        const rows = await this.databaseService.query(sql).promise;
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
                    .select(HIDDEN_UID_ANNOTATION)
                    .from(dataSourceNames)
                    .offset(indexRange.start)
                    .limit(indexRange.end - indexRange.start + 1);

                DatabaseFileService.applyFiltersAndSorting(subQuery, selection);
                subQueries.push(`${HIDDEN_UID_ANNOTATION} IN (${subQuery.toSQL()})`);
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
                    .map((annotationName) => new IncludeFilter([annotationName]).toSQLWhereString())
                    .join(" AND ")
            );
        }
        if (selection.exclude && selection.exclude.length > 0) {
            subQuery.where(
                selection.exclude
                    .map((annotationName) => new ExcludeFilter([annotationName]).toSQLWhereString())
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
        let buffer;
        const name = `file-selection-${new Date()}.${format}`;
        // If the file system is accessible, find the default download location
        if (this.downloadService.isFileSystemAccessible) {
            const downloadDir = await this.downloadService.getDefaultDownloadDirectory();
            const separator = navigator.userAgent.toLowerCase().includes("windows") ? "\\" : "/";
            const destination = `${downloadDir}${separator}${name}`;
            buffer = await this.databaseService.saveQuery(destination, sql, format);
        } else {
            buffer = await this.databaseService.saveQuery(uniqueId(), sql, format);
        }

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
            WHERE ${HIDDEN_UID_ANNOTATION} = '${fileId}'; \
        `;
        return this.databaseService.execute(sql);
    }
}
