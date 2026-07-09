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
import Annotation from "../../../entity/Annotation";
import FileFilter from "../../../entity/FileFilter";
import FileSelection from "../../../entity/FileSelection";
import FileSet from "../../../entity/FileSet";
import FileDetail from "../../../entity/FileDetail";
import resolvePathIsArray from "../../../entity/resolvePathIsArray";
import SQLBuilder from "../../../entity/SQLBuilder";

type UnwrappedMetadataValue =
    | PrimitiveMetadataValue[]
    | PrimitiveMetadataValue
    | NestedMetadataValue[]
    | NestedMetadataValue
    | null
    | undefined;
type FileRow = {
    [HIDDEN_UID_ANNOTATION]?: string;
    [key: string]: UnwrappedMetadataValue;
};

/**
 * Helper function to parse values found in database into either a list of primitive values or a list of nested objects, or an empty array if no valid values are found.
 * Filters out any null/undefined values, empty objects, and empty strings (or whitespace-only strings) from the results.
 * Also, trims whitespace start/end of string values.
 */
function parseMetadata(
    unwrappedMetadata: UnwrappedMetadataValue
): { nested: NestedMetadataValue[]; primitives: PrimitiveMetadataValue[] } {
    // Is a single object that isn't null/undefined
    // || is array of objects that isn't empty and whose first element is an object that isn't null/undefined
    const valueAsArray = castArray<PrimitiveMetadataValue | NestedMetadataValue | null>(
        unwrappedMetadata
    );

    // Iterate over values in array to grab any actual non-nil non-empty objects
    // also, while iterating check for presence of primitive values
    const primitives: PrimitiveMetadataValue[] = [];
    const nested: NestedMetadataValue[] = [];
    for (const value of valueAsArray) {
        if (isNil(value)) continue;
        if (isObject(value)) {
            if (isEmpty(value)) continue;
            nested.push(value as NestedMetadataValue);
        } else {
            const trimmedValue = typeof value === "string" ? value.trim() : value;
            if (isEmpty(String(trimmedValue))) continue;
            primitives.push(trimmedValue as PrimitiveMetadataValue);
        }
    }

    if (primitives.length === 0 && nested.length === 0) {
        return { primitives: [], nested: [] };
    }

    // If the value is sometimes an object but not always, we have a mixed array of primitives and objects,
    // which is unexpected for nested metadata. Log an error and return an empty array.
    // May even want to throw an error here, but for now just log and return empty arrays to avoid crashing the app.
    if (primitives.length > 0 && nested.length > 0) {
        console.error(
            "Unexpected mixed primitive and object values in nested metadata:",
            unwrappedMetadata
        );
        return { primitives: [], nested: [] };
    }
    return { primitives, nested };
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
function unwrapNestedMetadata(values: UnwrappedMetadataValue): MetadataValue {
    // Either nested or primitives will have values, but not both.
    // If both are empty, return an empty array.
    const { nested, primitives } = parseMetadata(values);

    // Recursive case: values is an array of nested metadata objects
    if (!isEmpty(nested)) {
        return nested.map((nestedValue) =>
            Object.entries(nestedValue).reduce((acc, [key, value]) => {
                const unwrappedValue = unwrapNestedMetadata(value);
                if (isEmpty(unwrappedValue)) return acc;
                return { ...acc, [key]: unwrappedValue };
            }, {} as NestedMetadataValue)
        );
    }

    // Base case: values is an array of primitives
    if (!isEmpty(primitives)) {
        // TODO: Because everything is always a string
        // we can narrow the returned type
        return String(primitives)
            .split(DatabaseService.LIST_DELIMITER)
            .map((value) => value.trim());
    }

    // If there were no nested or primitive values, return an empty array
    return [];
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
    public readonly provenanceIdColumns = ["File Path", "File ID"];

    private static convertDatabaseRowToFileDetail(row: FileRow, env: Environment): FileDetail {
        const uniqueId = row[HIDDEN_UID_ANNOTATION];
        if (!uniqueId) {
            throw new Error("Missing auto-generated unique ID");
        }

        const annotations = Object.entries(row).flatMap(([name, values]): FmsFileAnnotation[] => {
            // Filter out UID annotation used for selection logic
            if (name === HIDDEN_UID_ANNOTATION) return [];

            // It is possible the column is formatted as a JSON string
            // representing a nested annotation or array of annotations,
            // so we attempt to parse that if the value is a string
            if (typeof values === "string") {
                try {
                    const parsed = JSON.parse(values);
                    const metadata = unwrapNestedMetadata(parsed);
                    if (metadata.length) {
                        return [{ name, values: metadata }];
                    }
                } catch {
                    // Not unparsed JSON — fall through to plain string handling
                }
            }

            const unwrappedValues = unwrapNestedMetadata(values);

            // Skip any annotations that have no values after unwrapping, since they are effectively empty
            if (unwrappedValues.length === 0) return [];

            // Default case: primitive value or array of primitives,
            // potentially delimited by DatabaseService.LIST_DELIMITER
            return [{ name, values: unwrappedValues }];
        });

        return new FileDetail({ annotations }, env, uniqueId);
    }

    /**
     * Build the SELECT clause columns for a manifest query.
     *
     * Selecting a nested sub-field column (dotted name like "Well.Dose.Unit") directly would
     * cause a DuckDB Binder Error since no such column exists at the top level.
     *
     * For JSON and Parquet we preserve nested structure so the output file round-trips back
     * into BFF with the same annotation columns. We reconstruct a *partial* STRUCT containing
     * only the user-selected sub-fields:
     *
     *   "Well.Color" selected           → list_transform("Well", __e -> {'Color': __e."Color"}) AS "Well"
     *   "Well.Color" + "Well.Name"      → list_transform("Well", __e -> {'Color': __e."Color", 'Name': __e."Name"}) AS "Well"
     *   "Well.Dose.Unit"                → list_transform("Well", __e -> {'Dose': {'Unit': __e."Dose"."Unit"}}) AS "Well"
     *
     * Multiple sub-fields sharing the same root are grouped into one expression so the root
     * column appears only once in the SELECT list.
     */
    // Lambda variable names for nested list_transform levels.
    // Outer lambdas use earlier entries; "__e" is reserved for the root list_transform.
    private static readonly LAMBDA_VARS = ["__e", "__f", "__g", "__h", "__i"];

    private static buildManifestSelectColumns(
        annotations: string[],
        pathIsArrayByName: Map<string, boolean[]>
    ): string {
        // Reconstruct a partial struct for each root column containing only the selected
        // sub-fields. For STRUCT[] (array) roots, wrap in list_transform. For plain STRUCT
        // roots, use direct field-path access so list_transform is never called on a non-list.
        //
        // Intermediate array segments (STRUCT[] inside a STRUCT[]) get their own nested
        // list_transform with a fresh lambda variable rather than a plain dot-access, because
        // DuckDB cannot extract struct fields from a list expression.
        const flatCols: string[] = [];
        const rootGroups = new Map<
            string,
            { subPaths: Array<{ segments: string[]; isArray: boolean[] }>; isRootArray: boolean }
        >();

        for (const annotation of annotations) {
            const path = annotation.split(".");
            if (path.length === 1) {
                flatCols.push(`"${path[0]}"`);
            } else {
                const [root, ...subSegments] = path;
                const pathIsArray = resolvePathIsArray(annotation, path.length, pathIsArrayByName);
                const [isRootArray, ...subIsArray] = pathIsArray;
                if (!rootGroups.has(root)) {
                    rootGroups.set(root, { subPaths: [], isRootArray: isRootArray === true });
                }
                rootGroups.get(root)?.subPaths.push({ segments: subSegments, isArray: subIsArray });
            }
        }

        const nestedCols: string[] = [];
        for (const [root, { subPaths, isRootArray }] of rootGroups) {
            if (isRootArray) {
                const lambdaVar = DatabaseFileService.LAMBDA_VARS[0];
                const structExpr = DatabaseFileService.buildPartialStructExpr(
                    subPaths,
                    lambdaVar,
                    1
                );
                nestedCols.push(
                    `${SQLBuilder.listTransform(`"${root}"`, lambdaVar, structExpr)} AS "${root}"`
                );
            } else {
                // Plain STRUCT: rebuild partial struct with direct field-path access.
                const structExpr = DatabaseFileService.buildPartialStructExpr(
                    subPaths,
                    `"${root}"`,
                    1
                );
                nestedCols.push(`${structExpr} AS "${root}"`);
            }
        }

        return [...flatCols, ...nestedCols].join(", ");
    }

    /**
     * Recursively build a DuckDB struct literal `{field: expr, ...}` containing only the
     * given sub-paths, accessed relative to `elemVar`.
     *
     * When an intermediate field is itself a list (STRUCT[]), a nested list_transform is
     * emitted with the next available lambda variable so DuckDB can iterate it correctly.
     *
     * `lambdaDepth` tracks how many levels of list_transform have been opened so far, used
     * to pick a fresh lambda variable for each nested list_transform.
     */
    private static buildPartialStructExpr(
        paths: Array<{ segments: string[]; isArray: boolean[] }>,
        elemVar: string,
        lambdaDepth: number
    ): string {
        // Group by the first segment so shared intermediates collapse into one entry.
        const grouped = new Map<
            string,
            { isArray: boolean; subPaths: Array<{ segments: string[]; isArray: boolean[] }> }
        >();
        for (const { segments, isArray } of paths) {
            const [head, ...tailSegments] = segments;
            const [headIsArray = false, ...tailIsArray] = isArray;
            if (!grouped.has(head)) {
                grouped.set(head, { isArray: headIsArray, subPaths: [] });
            }
            if (tailSegments.length > 0) {
                grouped.get(head)?.subPaths.push({ segments: tailSegments, isArray: tailIsArray });
            }
        }

        const entries: string[] = [];
        for (const [field, { isArray: fieldIsArray, subPaths }] of grouped) {
            const access = `${elemVar}."${field}"`;
            if (subPaths.length === 0) {
                // Leaf field — plain scalar access
                entries.push(`'${field}': ${access}`);
            } else if (fieldIsArray) {
                // Intermediate STRUCT[]: introduce a nested list_transform with a fresh variable.
                const innerVar =
                    DatabaseFileService.LAMBDA_VARS[lambdaDepth] ?? `__e${lambdaDepth}`;
                const innerExpr = DatabaseFileService.buildPartialStructExpr(
                    subPaths,
                    innerVar,
                    lambdaDepth + 1
                );
                entries.push(
                    `'${field}': ${SQLBuilder.listTransform(access, innerVar, innerExpr)}`
                );
            } else {
                // Intermediate plain STRUCT: continue dot-access in the same scope.
                const innerExpr = DatabaseFileService.buildPartialStructExpr(
                    subPaths,
                    access,
                    lambdaDepth
                );
                entries.push(`'${field}': ${innerExpr}`);
            }
        }
        return `{${entries.join(", ")}}`;
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
            .toQuerySQLBuilder(await this.fetchPathIsArrayByName())
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
            .toQuerySQLBuilder(await this.fetchPathIsArrayByName())
            .from(this.dataSourceNames)
            .offset(request.from * request.limit)
            .limit(request.limit)
            .toSQL();

        const rows = await this.databaseService.query<FileRow>(sql).promise;
        const env = this.downloadService.getEnvironmentFromUrl();
        return rows.map((row) => DatabaseFileService.convertDatabaseRowToFileDetail(row, env));
    }

    /**
     * Get a single file that has a unique ID matching uid
     */
    public async getFileByUid(uid: string): Promise<FileDetail | undefined> {
        let files;
        try {
            files = await this.getFiles({
                from: 0,
                limit: 1,
                fileSet: new FileSet({
                    fileService: this,
                    filters: [new FileFilter(HIDDEN_UID_ANNOTATION, uid)],
                }),
            });
        } catch (err) {
            console.error(`Failed to find file with uid ${uid}. Error: ${(err as Error).message}`);
            return undefined;
        }
        if (files.length !== 1) {
            throw new Error(
                `Failed to fetch 1 file for uid ${uid}. Found ${files.length} instead.`
            );
        }
        return files[0];
    }

    public static getSelectionSql(
        annotations: string[],
        selections: Selection[],
        dataSourceNames: string[],
        pathIsArrayByName: Map<string, boolean[]>
    ): string {
        const subQueries: string[] = [];
        selections.forEach((selection) => {
            selection.indexRanges.forEach((indexRange) => {
                const subQuery = new SQLBuilder()
                    .select(HIDDEN_UID_ANNOTATION)
                    .from(dataSourceNames)
                    .where(FileFilter.toListOfWhereClauses(selection.filters, pathIsArrayByName))
                    .offset(indexRange.start)
                    .limit(indexRange.end - indexRange.start + 1);

                if (selection.sort) {
                    subQuery.orderBy(
                        selection.sort.toOrderByClause(
                            resolvePathIsArray(
                                selection.sort.annotationName,
                                selection.sort.path.length,
                                pathIsArrayByName
                            )
                        )
                    );
                }
                subQueries.push(`${HIDDEN_UID_ANNOTATION} IN (${subQuery.toSQL()})`);
            });
        });

        return new SQLBuilder()
            .select(DatabaseFileService.buildManifestSelectColumns(annotations, pathIsArrayByName))
            .from(dataSourceNames)
            .where(subQueries.join(" OR "))
            .toSQL();
    }

    public async getManifest(
        annotations: string[],
        selections: Selection[],
        format: "csv" | "json" | "parquet"
    ): Promise<File> {
        const sql = DatabaseFileService.getSelectionSql(
            annotations,
            selections,
            this.dataSourceNames,
            await this.fetchPathIsArrayByName()
        );
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
        const sql = DatabaseFileService.getSelectionSql(
            annotations,
            selections,
            this.dataSourceNames,
            await this.fetchPathIsArrayByName()
        );
        return this.handleFileDownload(sql, format);
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

    /**
     * Build the `name -> pathIsArray` map.
     *
     * Fetching the annotations should be O(1) since it is cached
     */
    private async fetchPathIsArrayByName(): Promise<Map<string, boolean[]>> {
        const annotations = await this.databaseService.fetchAnnotations(this.dataSourceNames);
        return Annotation.pathIsArrayByName(annotations);
    }
}
