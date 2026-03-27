import * as duckdb from "@duckdb/duckdb-wasm";
import axios from "axios";
import { isEmpty, mapKeys } from "lodash";

import { AICS_FMS_DATA_SOURCE_NAME } from "../../constants";
import Annotation from "../../entity/Annotation";
import { AnnotationType } from "../../entity/AnnotationFormatter";
import { EdgeDefinition } from "../../entity/Graph";
import { Source } from "../../entity/SearchParams";
import SQLBuilder from "../../entity/SQLBuilder";
import DataSourcePreparationError from "../../errors/DataSourcePreparationError";

enum PreDefinedColumn {
    FILE_ID = "File ID",
    FILE_PATH = "File Path",
    FILE_NAME = "File Name",
    FILE_SIZE = "File Size",
    THUMBNAIL = "Thumbnail",
    UPLOADED = "Uploaded",
}
const PRE_DEFINED_COLUMNS = Object.values(PreDefinedColumn);

// Map each actual column name to the predefined column name when they fuzzy-match.
function getActualToPreDefinedColumnMap(columns: string[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const preDefinedColumn of PRE_DEFINED_COLUMNS) {
        const preDefinedColumnSimplified = preDefinedColumn.toLowerCase().replace(" ", "");
        // Grab near matches to the pre-defined columns like "file_name" for "File Name"
        const matches = [...columns].filter(
            (column) =>
                preDefinedColumnSimplified ===
                // Matches regardless of caps, whitespace, hyphens, or underscores
                column.toLowerCase().replaceAll(/\s|-|_/g, "")
        );

        // Doesn't seem like we should guess at a pre-defined column match in this case
        // so just toss up a user-actionable error to try to get them to retry
        if (matches.length > 1) {
            throw new Error(
                `Too many columns similar to pre-defined column: "${preDefinedColumn}", narrow
                these down to just one column exactly equal or similar to "${preDefinedColumn}".
                Found: ${matches}.`
            );
        }
        if (matches.length === 1) {
            map.set(matches[0], preDefinedColumn);
        }
    }
    return map;
}

/**
 * Derive a "File Name" from a path-like column (local path or URL).
 */
function getFileNameFromPathExpression(quotedPathColumn: string): string {
    const cleaned = `REGEXP_REPLACE(
        REGEXP_REPLACE(${quotedPathColumn}, '[?#].*$', ''),
        '/+$',
        ''
    )`;
    const basename = `REGEXP_EXTRACT(${cleaned}, '([^/]+)$', 1)`;
    const stripOme = `REGEXP_REPLACE(${basename}, '(?i)\\\\.ome$', '')`;

    return `COALESCE(NULLIF(${stripOme}, ''), ${quotedPathColumn})`;
}

/**
 * For parquets: add a computed "File Name" when we have "File Path" but not "File Name".
 */
export function getParquetFileNameSelectPart(
    actualToPreDefined: Map<string, string>
): string | null {
    const hasFileName = [...actualToPreDefined.values()].includes(PreDefinedColumn.FILE_NAME);
    if (hasFileName) return null;

    const pathColumn = [...actualToPreDefined.entries()].find(
        ([, predefined]) => predefined === PreDefinedColumn.FILE_PATH
    )?.[0];
    if (!pathColumn) return null;

    return `${getFileNameFromPathExpression(`"${pathColumn}"`)} AS "${PreDefinedColumn.FILE_NAME}"`;
}

function splitAtTopLevel(input: string): string[] {
    const parts: string[] = [];
    let current = "";
    let depth = 0;

    for (const character of input) {
        if (character === "(") {
            depth += 1;
            current += character;
            continue;
        }

        if (character === ")") {
            depth = Math.max(0, depth - 1);
            current += character;
            continue;
        }

        if (character === "," && depth === 0) {
            const trimmed = current.trim();
            if (trimmed) {
                parts.push(trimmed);
            }
            current = "";
            continue;
        }

        current += character;
    }

    const trimmed = current.trim();
    if (trimmed) {
        parts.push(trimmed);
    }

    return parts;
}

type StructField = {
    name: string;
    typeExpression: string;
};

function parseStructFields(typeExpression: string): StructField[] {
    // const match = typeExpression.match(/^STRUCT\((.*)\)$/i);
    // if (!match) {
    //     console.log("no match")
    //     return [];
    // }

    return splitAtTopLevel(typeExpression.substring("STRUCT(".length, typeExpression.length - 1))
        .map((fieldDef) => {
            const quoted = fieldDef.match(/^"([^"]+)"\s+(.+)$/);
            if (quoted) {
                return {
                    name: quoted[1],
                    typeExpression: quoted[2].trim(),
                };
            }

            const unquoted = fieldDef.match(/^([^\s]+)\s+(.+)$/);
            if (unquoted) {
                return {
                    name: unquoted[1],
                    typeExpression: unquoted[2].trim(),
                };
            }

            return {
                name: "",
                typeExpression: "",
            };
        })
        .filter((field) => field.name.length > 0);
}

function collectNestedStructPaths(
    typeExpression: string,
    currentPath: string[] = []
): string[][] {
    const fields = parseStructFields(typeExpression);
    if (fields.length === 0) {
        return [];
    }

    return fields.flatMap((field) => {
        const nextPath = [...currentPath, field.name];
        const nestedPaths = collectNestedStructPaths(field.typeExpression, nextPath);
        return nestedPaths.length > 0 ? nestedPaths : [nextPath];
    });
}

/**
 * A discovered path within an array-of-objects annotation column.
 *
 * `displayPath`  – dot-separated schema key (e.g. "Gene", "Dose.Value").
 * `jsonPath`      – full DuckDB JSONPath string for extracting all matching values
 *                   across every array element (e.g. "$[*].Gene",
 *                   "$[*].Dose[*].Value").
 */
interface JsonSchemaPath {
    displayPath: string;
    jsonPath: string;
}

/**
 * Recursively collect leaf paths from an array-of-objects JSON value, building
 * both a human-readable dot-path and a DuckDB JSONPath expression.
 *
 * Handles arbitrary depth of nested arrays and objects:
 *   [{"Gene":"TP53", "Dose":[{"Unit":"mL","Value":30}]}]
 *     → [{displayPath:"Gene",        jsonPath:"$[*].Gene"},
 *        {displayPath:"Dose.Unit",    jsonPath:"$[*].Dose[*].Unit"},
 *        {displayPath:"Dose.Value",   jsonPath:"$[*].Dose[*].Value"}]
 *
 * @param items     The parsed JSON array to inspect (first element is sampled).
 * @param jsonPrefix JSONPath prefix so far ("$[*]" at the top level).
 * @param displayPrefix dot-path prefix so far ("" at top level).
 */
function collectJsonArraySchemaPaths(
    items: unknown[],
    jsonPrefix: string = "$[*]",
    displayPrefix: string = ""
): JsonSchemaPath[] {
    const seen = new Set<string>();
    const paths: JsonSchemaPath[] = [];

    // Merge keys from the first few elements to cover optional fields.
    const sampleElements = items.slice(0, 5);
    for (const elem of sampleElements) {
        if (typeof elem !== "object" || elem === null || Array.isArray(elem)) continue;
        for (const [key, val] of Object.entries(elem as Record<string, unknown>)) {
            const display = displayPrefix ? `${displayPrefix}.${key}` : key;
            const jsonKey = `${jsonPrefix}.${key}`;

            if (Array.isArray(val)) {
                // Nested array — recurse with [*] wildcard
                const sub = collectJsonArraySchemaPaths(
                    val,
                    `${jsonKey}[*]`,
                    display
                );
                if (sub.length > 0) {
                    for (const p of sub) {
                        if (!seen.has(p.displayPath)) {
                            seen.add(p.displayPath);
                            paths.push(p);
                        }
                    }
                } else {
                    // Array of primitives — the array itself is the leaf
                    if (!seen.has(display)) {
                        seen.add(display);
                        paths.push({ displayPath: display, jsonPath: `${jsonKey}[*]` });
                    }
                }
            } else if (typeof val === "object" && val !== null) {
                // Nested object — recurse without array wildcard
                const sub = collectJsonArraySchemaPaths([val], jsonKey, display);
                if (sub.length > 0) {
                    for (const p of sub) {
                        if (!seen.has(p.displayPath)) {
                            seen.add(p.displayPath);
                            paths.push(p);
                        }
                    }
                } else {
                    if (!seen.has(display)) {
                        seen.add(display);
                        paths.push({ displayPath: display, jsonPath: jsonKey });
                    }
                }
            } else {
                // Primitive leaf
                if (!seen.has(display)) {
                    seen.add(display);
                    paths.push({ displayPath: display, jsonPath: jsonKey });
                }
            }
        }
    }
    return paths;
}

function quoteIdentifier(identifier: string): string {
    return `"${identifier.replaceAll('"', '""')}"`;
}

function buildStructExtractExpression(columnName: string, fieldPath: string[]): string {
    return fieldPath.reduce(
        (expr, fieldName) => `${expr}.${quoteIdentifier(fieldName)}`,
        quoteIdentifier(columnName)
    );
}

export function getParquetNestedMetadataSelectParts(
    describedColumns: Array<{ column_name: string; data_type: string }>
): string[] {
    const nestedSelectParts: string[] = [];

    for (const row of describedColumns) {
        const nestedFieldPaths = collectNestedStructPaths(row.data_type || "");
        for (const fieldPath of nestedFieldPaths) {
            const alias = quoteIdentifier(`${row.column_name}.${fieldPath.join(".")}`);
            const fieldExpression = buildStructExtractExpression(row.column_name, fieldPath);
            nestedSelectParts.push(
                `CAST(${fieldExpression} AS VARCHAR) AS ${alias}`
            );
        }
    }

    return nestedSelectParts;
}

/**
 * Service reponsible for querying against a database
 */
export default class DatabaseService {
    // TODO: use
    public static readonly GROUP_DELIMITER = ".";
    public static readonly LIST_DELIMITER = ",";
    // Name of the hidden column BFF uses to uniquely identify rows
    public static readonly HIDDEN_UID_ANNOTATION = "hidden_bff_uid";
    private static readonly RAW_SUFFIX = "__bff_raw";
    protected readonly SOURCE_METADATA_TABLE = "source_metadata";
    protected readonly SOURCE_PROVENANCE_TABLE = "source_provenance";
    private static readonly ANNOTATION_TYPE_SET = new Set(Object.values(AnnotationType));
    private sourceMetadataName?: string;
    public sourceProvenanceName?: string;
    private currentAggregateSource?: string;
    // Initialize with AICS FMS data source name to pretend it always exists
    protected readonly existingDataSources = new Set([AICS_FMS_DATA_SOURCE_NAME]);
    private readonly dataSourceToAnnotationsMap: Map<string, Annotation[]> = new Map();
    private readonly dataSourceToProvenanceMap: Map<string, EdgeDefinition[]> = new Map();
    // Data source names that are views (parquet), so we DROP VIEW on delete
    private readonly parquetDirectViewNames = new Set<string>();

    protected database: duckdb.AsyncDuckDB | undefined;

    constructor() {
        this.addDataSource = this.addDataSource.bind(this);
        this.execute = this.execute.bind(this);
        this.query = this.query.bind(this);
    }

    public async initialize(logLevel: duckdb.LogLevel = duckdb.LogLevel.WARNING) {
        const allBundles = duckdb.getJsDelivrBundles();

        // Selects the best bundle based on browser checks
        const bundle = await duckdb.selectBundle(allBundles);
        const worker_url = URL.createObjectURL(
            new Blob([`importScripts("${bundle.mainWorker}");`], { type: "text/javascript" })
        );
        // Instantiate the asynchronous version of DuckDB-wasm
        const worker = new Worker(worker_url);
        const logger = new duckdb.ConsoleLogger(logLevel);
        this.database = new duckdb.AsyncDuckDB(logger, worker);
        await this.database.instantiate(bundle.mainModule, bundle.pthreadWorker);
        URL.revokeObjectURL(worker_url);
    }

    public async saveQuery(
        destination: string,
        sql: string,
        format: "parquet" | "csv" | "json"
    ): Promise<Uint8Array> {
        if (!this.database) {
            throw new Error("Database failed to initialize");
        }

        const resultName = `${destination}.${format}`;
        const formatOptions = format === "json" ? ", ARRAY true" : "";
        const finalSQL = `COPY (${sql}) TO '${resultName}' (FORMAT '${format}'${formatOptions});`;
        const connection = await this.database.connect();
        try {
            await connection.send(finalSQL);
            return await this.database.copyFileToBuffer(resultName);
        } finally {
            await connection.close();
        }
    }

    public async query(sql: string): Promise<{ [key: string]: any }[]> {
        // Time this
        const start = Date.now();
        if (!this.database) {
            throw new Error("Database failed to initialize");
        }
        const connection = await this.database?.connect();
        try {
            const result = await connection.query(sql);
            const resultAsArray = result.toArray();
            const resultAsJSONString = JSON.stringify(
                resultAsArray,
                (_, value) => (typeof value === "bigint" ? value.toString() : value) // return everything else unchanged
            );
            return JSON.parse(resultAsJSONString);
        } catch (err) {
            throw new Error(
                `${(err as Error).message}. \nThe above error occured while executing query: ${sql}`
            );
        } finally {
            await connection.close();
            const end = Date.now();
            if (end-start >= 30_000) {
                console.warn(`Very slow query: Query executed in ${(end - start) / 1000}s: ${DatabaseService.truncateString(sql, 200)}`);
            } else if (end-start >= 15_000) {
                console.warn(`Slow query: Query executed in ${(end - start) / 1000}s: ${DatabaseService.truncateString(sql, 200)}`);
            } else if (end-start >= 1_000) {
                console.warn(`Slightly slow query: Query executed in ${(end - start) / 1000}s: ${DatabaseService.truncateString(sql, 200)}`);
            }
            // console.log(`Query executed in ${end - start}ms: ${sql.substring(0, 100)}...`);
        }
    }

    public async close(): Promise<void> {
        this.database?.detach();
    }

    protected async addDataSource(
        name: string,
        type: "csv" | "json" | "parquet",
        uri: string | File
    ): Promise<void> {
        if (!this.database) {
            throw new Error("Database failed to initialize");
        }

        // Register the user's input under an internal name so we can create a
        // table or view named `name`
        const registerName = `${name}${DatabaseService.RAW_SUFFIX}.${type}`;

        if (uri instanceof File) {
            await this.database.registerFileHandle(
                registerName,
                uri,
                duckdb.DuckDBDataProtocol.BROWSER_FILEREADER,
                true
            );
        } else {
            const protocol = uri.startsWith("s3")
                ? duckdb.DuckDBDataProtocol.S3
                : duckdb.DuckDBDataProtocol.HTTP;

            await this.database.registerFileURL(registerName, uri, protocol, false);
        }

        if (type === "parquet") {
            await this.createParquetDirectView(name, registerName);
        } else if (type === "json") {
            await this.execute(`CREATE TABLE "${name}" AS FROM read_json_auto('${registerName}');`);
        } else {
            // Default to CSV
            await this.execute(
                `CREATE TABLE "${name}" AS FROM read_csv_auto('${registerName}', header=true, all_varchar=true);`
            );
        }
    }

    public async execute(sql: string): Promise<void> {
        if (!this.database) {
            throw new Error("Database failed to initialize");
        }

        const connection = await this.database.connect();
        try {
            await connection.query(sql);
        } finally {
            await connection.close();
        }
    }

    private static columnTypeToAnnotationType(columnType: string): AnnotationType {
        switch (columnType) {
            case "INTEGER":
            case "BIGINT":
            // TODO: Add support for column types
            // https://github.com/AllenInstitute/biofile-finder/issues/60
            // return AnnotationType.NUMBER;
            case "VARCHAR":
            case "TEXT":
            default:
                return AnnotationType.STRING;
        }
    }

    private static truncateString(str: string, length: number): string {
        return str.length > length
            ? `${str.slice(0, length / 2)}...${str.slice(str.length - length / 2)}`
            : str;
    }

    public hasDataSource(dataSourceName: string): boolean {
        return this.existingDataSources.has(dataSourceName);
    }

    public async prepareDataSources(
        dataSources: Source[],
        skipNormalization = false
    ): Promise<void> {
        await Promise.all(
            dataSources
                .filter((dataSource) => !this.hasDataSource(dataSource.name))
                .map((dataSource) => this.prepareDataSource(dataSource, skipNormalization))
        );

        // Because when querying multiple data sources column differences can complicate the queries
        // preparing a table ahead of time that is the aggregate of the data sources is most optimal
        // should look toward some way of reducing the memory footprint if that becomes an issue
        if (dataSources.length > 1) {
            await this.aggregateDataSources(dataSources);
        }
    }

    private async prepareDataSource(dataSource: Source, skipNormalization: boolean): Promise<void> {
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
            // Add the data source as a table on the database
            await this.addDataSource(name, type, uri);

            // Add data source name to in-memory set
            // for quick data source checks
            this.existingDataSources.add(name);

            // Unless skipped, this will ensure the table is prepared
            // for querying with the expected columns & uniqueness constraints
            if (!skipNormalization) {
                if (type !== "parquet") {
                    await this.normalizeDataSourceColumnNames(name);
                }

                const errors = await this.checkDataSourceForErrors(name);
                if (errors.length) {
                    throw new Error(errors.join("</br></br>"));
                }

                if (type !== "parquet") {
                    await this.addRequiredColumns(name);
                }
            }
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

    public async prepareSourceMetadata(sourceMetadata: Source): Promise<void> {
        const isPreviousSource = sourceMetadata.name === this.sourceMetadataName;
        if (isPreviousSource) {
            return;
        }

        await this.deleteSourceMetadata();
        await this.prepareDataSource(
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
        await this.prepareDataSource(
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

    private async deleteDataSource(dataSource: string): Promise<void> {
        this.existingDataSources.delete(dataSource);
        this.dataSourceToAnnotationsMap.delete(dataSource);
        if (this.parquetDirectViewNames.has(dataSource)) {
            this.parquetDirectViewNames.delete(dataSource);
            await this.execute(`DROP VIEW IF EXISTS "${dataSource}"`);
        } else {
            await this.execute(`DROP TABLE IF EXISTS "${dataSource}"`);
        }
    }

    /*
        This ensures we have the columns necessary for the application to function
        MUST come after we check for errors so that we can rely on the table
        to at least be valid before modifying it further
    */
    private async addRequiredColumns(name: string): Promise<void> {
        const commandsToExecute = [
            // Add hidden UID column to uniquely identify rows
            `
                ALTER TABLE "${name}"
                ADD COLUMN ${DatabaseService.HIDDEN_UID_ANNOTATION} INT
            `,
            this.getUpdateHiddenUIDSQL(name),
        ];

        const dataSourceColumns = await this.getColumnsOnDataSource(name);

        /**
         * First checks if a "File Name" already exists,
         * then makes best shot attempt at auto-generating a "File Name"
         * from the "File Path", then defaults to full path if this fails.
         */
        const fileNameGenerationSQL = `
                UPDATE "${name}"
                SET "${PreDefinedColumn.FILE_NAME}" = COALESCE(
                    "${PreDefinedColumn.FILE_NAME}",
                    ${getFileNameFromPathExpression(`"${PreDefinedColumn.FILE_PATH}"`)}
                );`;
        if (!dataSourceColumns.has(PreDefinedColumn.FILE_NAME)) {
            commandsToExecute.push(`
                ALTER TABLE "${name}"
                ADD COLUMN "${PreDefinedColumn.FILE_NAME}" VARCHAR;
            `);
            commandsToExecute.push(fileNameGenerationSQL);
        } else {
            // Check for any blank "File Name" rows
            const blankFileNameRows = await this.getRowsWhereColumnIsBlank(
                name,
                PreDefinedColumn.FILE_NAME
            );
            // Some or all of the files need autogenerated names
            if (blankFileNameRows.length > 0) {
                commandsToExecute.push(fileNameGenerationSQL);
            }
        }

        await this.execute(commandsToExecute.join("; "));

        // Because we edited the column names this cache is now invalid
        this.dataSourceToAnnotationsMap.delete(name);
    }

    private getUpdateHiddenUIDSQL(tableName: string): string {
        // Altering tables to add primary keys or serially generated columns
        // isn't yet supported in DuckDB, so this does a serially generated
        // column addition manually
        return `
            UPDATE "${tableName}"
            SET "${DatabaseService.HIDDEN_UID_ANNOTATION}" = SQ.row
            FROM (
                SELECT "${PreDefinedColumn.FILE_PATH}", ROW_NUMBER() OVER (ORDER BY "${PreDefinedColumn.FILE_PATH}") AS row
                FROM "${tableName}"
            ) AS SQ
            WHERE "${tableName}"."${PreDefinedColumn.FILE_PATH}" = SQ."${PreDefinedColumn.FILE_PATH}";
        `;
    }

    /*
        Checks the data source for unexpected formatting or issues in
        the expectations around uniqueness/blankness for pre-defined columns
        like "File Path", "File ID", etc.
    */
    private async checkDataSourceForErrors(name: string): Promise<string[]> {
        const errors: string[] = [];
        const columnsOnTable = await this.getColumnsOnDataSource(name);

        if (!columnsOnTable.has(PreDefinedColumn.FILE_PATH)) {
            let error = `"${PreDefinedColumn.FILE_PATH}" column is missing in the data source.
                Check the data source header row for a "${PreDefinedColumn.FILE_PATH}" column name and try again.`;

            // Attempt to find a column with a similar name to "File Path"
            const columns = Array.from(columnsOnTable);
            const filePathLikeColumn =
                columns.find((column) => column.toLowerCase().includes("path")) ||
                columns.find((column) => column.toLowerCase().includes("file"));
            if (filePathLikeColumn) {
                error += ` Found a column with a similar name: "${filePathLikeColumn}".`;
            }

            // Unable to determine if the file path is empty or not
            // when it is not present so return here before checking
            // for other errors
            errors.push(error);
        } else {
            // Check for empty or just whitespace File Path column values
            const blankFilePathRows = await this.getRowsWhereColumnIsBlank(
                name,
                PreDefinedColumn.FILE_PATH
            );
            if (blankFilePathRows.length > 0) {
                const rowNumbers = DatabaseService.truncateString(
                    blankFilePathRows.join(", "),
                    100
                );
                errors.push(
                    `"${PreDefinedColumn.FILE_PATH}" column contains ${blankFilePathRows.length} empty or purely whitespace paths at rows ${rowNumbers}.`
                );
            }
        }

        return errors;
    }

    /*
        Some columns like "File Path", "File ID", "Thumbnail", etc.
        have expectations around how they should be cased/formatted
        so this will attempt to find the nearest match to the pre-defined
        columns and format them appropriatedly
    */
    private async normalizeDataSourceColumnNames(dataSourceName: string): Promise<void> {
        const columnsOnDataSource = await this.getColumnsOnDataSource(dataSourceName);
        const actualToPreDefined = getActualToPreDefinedColumnMap([...columnsOnDataSource]);

        const combinedAlterCommands = [...actualToPreDefined.entries()]
            .map(
                ([actualColumn, preDefinedColumn]) =>
                    `ALTER TABLE "${dataSourceName}" RENAME COLUMN "${actualColumn}" TO '${preDefinedColumn}'`
            )
            .join("; ");

        if (combinedAlterCommands) {
            await this.execute(combinedAlterCommands);
        }

        // Because we edited the column names this cache is now invalid
        this.dataSourceToAnnotationsMap.delete(dataSourceName);
    }

    // Create a view over the parquet file that exposes columns under predefined names (e.g. "File Path")
    // and adds hidden_bff_uid.
    private async createParquetDirectView(
        viewName: string,
        parquetInternalName: string
    ): Promise<void> {
        // 1. Get original column names from the user's table.
        // Note: we don't use this.getColumnsOnDataSource, since that expects a
        // fully built data source, and this function is used for creating a
        // data source.
        const sql = new SQLBuilder().describe().from(parquetInternalName);
        const rows = await this.query(sql.toSQL());
        const rawColumns = rows.map((row) => row["column_name"] as string);
        // Build a map from column name to DuckDB type for later type-specific handling.
        const colTypeMap = new Map(
            rows.map((row) => [
                row["column_name"] as string,
                (row["column_type"] ?? row["data_type"] ?? "") as string,
            ])
        );
        // 2. Determine which columns need to be renamed, if any
        const actualToPreDefined = getActualToPreDefinedColumnMap(rawColumns);
        // 3. Prepare the SQL for renaming columns in the CREATE VIEW.
        //    STRUCT(...)[] columns (arrays of structs) are cast to JSON so that the runtime
        //    discovery path in fetchAnnotations treats them uniformly with JSON VARCHAR arrays.
        //    Plain STRUCT(...) columns are kept as-is and expanded below.
        const selectParts = rawColumns.map((col) => {
            const colType = colTypeMap.get(col) ?? "";
            const alias = actualToPreDefined.get(col) ?? col;
            // Array-of-structs: cast to JSON so the application layer can JSON.parse it.
            if (colType.startsWith("STRUCT(") && colType.trimEnd().endsWith("[]")) {
                return `CAST("${col}" AS JSON) AS "${alias}"`;
            }
            if (alias !== col) {
                return `"${col}" AS "${alias}"`;
            }
            return `"${col}"`;
        });
        const fileNameSelectPart = getParquetFileNameSelectPart(actualToPreDefined);
        if (fileNameSelectPart !== null) {
            selectParts.push(fileNameSelectPart);
        }
        // 3b. For plain parquet STRUCT columns (not STRUCT arrays), expose each leaf field as a
        //     separate VARCHAR column with a dotted alias (e.g. "Well.Gene").
        //     STRUCT(...)[] columns are already cast to JSON above and handled by runtime
        //     discovery in fetchAnnotations — no dot-notation expansion here.
        for (const row of rows) {
            const originalName = row["column_name"] as string;
            const colType = colTypeMap.get(originalName) ?? "";
            const isStructArray = colType.startsWith("STRUCT(") && colType.trimEnd().endsWith("[]");
            if (colType.startsWith("STRUCT") && !isStructArray) {
                const nestedPaths = collectNestedStructPaths(colType);
                for (const fieldPath of nestedPaths) {
                    // Use the renamed (predefined) column name as the alias prefix when applicable.
                    const aliasPrefix = actualToPreDefined.get(originalName) ?? originalName;
                    const alias = `"${aliasPrefix}.${fieldPath.join(".")}"`;
                    const expr = buildStructExtractExpression(originalName, fieldPath);
                    selectParts.push(`CAST(${expr} AS VARCHAR) AS ${alias}`);
                }
            }
        }
        selectParts.push(`"file_row_number" AS "${DatabaseService.HIDDEN_UID_ANNOTATION}"`);
        // 4. Create the view for this data source
        const createViewSql = `CREATE VIEW "${viewName}"
            AS SELECT ${selectParts.join(", ")}
            FROM parquet_scan('${parquetInternalName}');`;
        await this.execute(createViewSql);
        this.parquetDirectViewNames.add(viewName);
    }

    private async getRowsWhereColumnIsBlank(dataSource: string, column: string): Promise<number[]> {
        const blankColumnQueryResult = await this.query(`
            SELECT A.row
            FROM (
                SELECT ROW_NUMBER() OVER () AS row, "${column}"
                FROM "${dataSource}"
            ) AS A
            WHERE TRIM(A."${column}") IS NULL
        `);
        return blankColumnQueryResult.map((row) => row.row);
    }

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
        await this.execute(this.getUpdateHiddenUIDSQL(viewName));
    }

    public async processProvenance(provenanceSource: Source): Promise<EdgeDefinition[]> {
        await this.prepareSourceProvenance(provenanceSource);

        const sql = new SQLBuilder().select("*").from(`${this.SOURCE_PROVENANCE_TABLE}`).toSQL();
        try {
            const rows = await this.query(sql);
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
            const rows = await this.query(sql);
            if (isEmpty(rows)) {
                throw new Error(`Unable to fetch annotations for ${aggregateDataSourceName}`);
            }
            const [annotationNameToDescriptionMap, annotationNameToTypeMap] = await Promise.all([
                this.fetchAnnotationDescriptions(),
                this.fetchAnnotationTypes(),
            ]);

            const annotations: Annotation[] = [];

            for (const row of rows) {
                const rawDataType = (row["data_type"] ?? "") as string;
                const colName = row["column_name"] as string;

                // STRUCT and MAP columns have a compile-time-fixed schema; their sub-fields
                // are already exposed as real view columns (e.g. "Well.Gene") via
                // createParquetDirectView so they will appear in subsequent rows of this query.
                const isStructOrMap =
                    rawDataType.startsWith("STRUCT(") || rawDataType.startsWith("MAP(");

                annotations.push(
                    new Annotation({
                        annotationName: colName,
                        annotationDisplayName: colName,
                        description: annotationNameToDescriptionMap[colName] || "",
                        type:
                            (annotationNameToTypeMap[colName] as AnnotationType) ||
                            DatabaseService.columnTypeToAnnotationType(rawDataType),
                        isNested: isStructOrMap,
                    })
                );

                // For plain VARCHAR and JSON columns, sample a few rows to detect whether the
                // values are JSON arrays of objects (e.g. [{"Label":"A3","Gene":"TP53",...},...]).
                // JSON-typed columns arise when a STRUCT(...)[] parquet column is cast to JSON
                // in createParquetDirectView. If confirmed, discover the value-schema paths
                // ("Gene", "Dose.Value") and register a virtual sub-field annotation for each.
                const isJsonLike = rawDataType === "VARCHAR" || rawDataType === "JSON";
                if (isJsonLike && !isStructOrMap) {
                    try {
                        const sampleSql = new SQLBuilder()
                            .select(`"${colName}"`)
                            .from(aggregateDataSourceName)
                            .where(`"${colName}" IS NOT NULL`)
                            .limit(DatabaseService.JSON_SCHEMA_SAMPLE_SIZE)
                            .toSQL();
                        const sampleRows = await this.query(sampleSql);

                        // Collect schema paths across all sampled rows (union).
                        const schemaPaths = new Map<string, JsonSchemaPath>();

                        for (const sampleRow of sampleRows) {
                            const raw = sampleRow[colName];
                            if (typeof raw !== "string") continue;
                            let parsed: unknown;
                            try { parsed = JSON.parse(raw); } catch { continue; }
                            // Only handle JSON arrays of objects.
                            if (!Array.isArray(parsed) || parsed.length === 0) continue;

                            const discovered = collectJsonArraySchemaPaths(parsed);
                            for (const p of discovered) {
                                if (!schemaPaths.has(p.displayPath)) {
                                    schemaPaths.set(p.displayPath, p);
                                }
                            }
                        }

                        if (schemaPaths.size > 0) {
                            // Mark the parent column as nested now that we confirmed it is.
                            annotations[annotations.length - 1] = new Annotation({
                                annotationName: colName,
                                annotationDisplayName: colName,
                                description: annotationNameToDescriptionMap[colName] || "",
                                type:
                                    (annotationNameToTypeMap[colName] as AnnotationType) ||
                                    DatabaseService.columnTypeToAnnotationType(rawDataType),
                                isNested: true,
                            });

                            // Register one virtual annotation per unique value-schema path.
                            for (const { displayPath, jsonPath } of schemaPaths.values()) {
                                const virtualName = `${colName}.${displayPath}`;
                                annotations.push(
                                    new Annotation({
                                        annotationName: virtualName,
                                        annotationDisplayName: virtualName,
                                        description: `Sub-field "${displayPath}" of "${colName}"`,
                                        type: AnnotationType.STRING,
                                        isNestedSubField: true,
                                        nestedParent: colName,
                                        nestedJsonPath: jsonPath,
                                    })
                                );
                            }
                        }
                    } catch {
                        // Sampling failed (e.g. column missing in aggregate) — skip virtual paths.
                    }
                }
            }

            this.dataSourceToAnnotationsMap.set(aggregateDataSourceName, annotations);
        }

        return this.dataSourceToAnnotationsMap.get(aggregateDataSourceName) || [];
    }

    /** Number of rows sampled when detecting JSON object columns for virtual sub-field discovery. */
    private static readonly JSON_SCHEMA_SAMPLE_SIZE = 20;

    private async getColumnsOnDataSource(name: string): Promise<Set<string>> {
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
            const rows = await this.query(sql);
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
            const rows = await this.query(sql);
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
