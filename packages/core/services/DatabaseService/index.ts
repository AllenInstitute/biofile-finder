import { isEmpty } from "lodash";

import { AICS_FMS_DATA_SOURCE_NAME } from "../../constants";
import Annotation from "../../entity/Annotation";
import { AnnotationType } from "../../entity/AnnotationFormatter";
import { Source } from "../../entity/FileExplorerURL";
import SQLBuilder from "../../entity/SQLBuilder";
import DataSourcePreparationError from "../../errors/DataSourcePreparationError";

const PRE_DEFINED_COLUMNS = [
    "File ID",
    "File Path",
    "File Name",
    "File Size",
    "Thumbnail",
    "Uploaded",
];

/**
 * Service reponsible for querying against a database
 */
export default abstract class DatabaseService {
    protected readonly SOURCE_METADATA_TABLE = "source_metadata";
    public static readonly LIST_DELIMITER = ",";
    // "Open file link" as a datatype must be hardcoded, and CAN NOT change
    // without BREAKING visibility in the dataset released in 2024 as part
    // of the EMT Data Release paper
    private static readonly OPEN_FILE_LINK_TYPE = "Open file link";
    private static readonly ANNOTATION_TYPE_SET = new Set([
        ...Object.values(AnnotationType),
        DatabaseService.OPEN_FILE_LINK_TYPE,
    ]);
    private currentAggregateSource?: string;
    // Initialize with AICS FMS data source name to pretend it always exists
    protected readonly existingDataSources = new Set([AICS_FMS_DATA_SOURCE_NAME]);
    private readonly dataSourceToAnnotationsMap: Map<string, Annotation[]> = new Map();

    public abstract saveQuery(
        _destination: string,
        _sql: string,
        _format: "csv" | "parquet" | "json"
    ): Promise<Uint8Array>;

    public abstract query(_sql: string): Promise<{ [key: string]: any }[]>;

    protected abstract addDataSource(
        _name: string,
        _type: "csv" | "json" | "parquet",
        _uri: string | File
    ): Promise<void>;

    protected abstract execute(_sql: string): Promise<void>;

    private static columnTypeToAnnotationType(columnType: string): string {
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

    constructor() {
        // 'this' scope gets lost when a higher order class (ex. DatabaseService)
        // calls a lower level class (ex. DatabaseServiceWeb)
        this.addDataSource = this.addDataSource.bind(this);
        this.execute = this.execute.bind(this);
        this.query = this.query.bind(this);
    }

    public async prepareDataSources(
        dataSources: Source[],
        skipNormalization = false
    ): Promise<void> {
        await Promise.all(
            dataSources
                .filter((dataSource) => !this.existingDataSources.has(dataSource.name))
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
                await this.normalizeDataSourceColumnNames(name);

                const errors = await this.checkDataSourceForErrors(name);
                if (errors.length) {
                    throw new Error(errors.join("</br></br>"));
                }

                await this.addRequiredColumns(dataSource.name);
            }
        } catch (err) {
            await this.deleteDataSource(name);
            throw new DataSourcePreparationError((err as Error).message, name);
        }
    }

    public async prepareSourceMetadata(sourceMetadata: Source): Promise<void> {
        if (sourceMetadata.type && sourceMetadata.uri) {
            this.deleteDataSource(this.SOURCE_METADATA_TABLE);
            this.dataSourceToAnnotationsMap.clear();
        }

        await this.prepareDataSource(
            {
                ...sourceMetadata,
                name: this.SOURCE_METADATA_TABLE,
            },
            true
        );
    }

    protected async deleteDataSource(dataSource: string): Promise<void> {
        this.existingDataSources.delete(dataSource);
        this.dataSourceToAnnotationsMap.delete(dataSource);
        await this.execute(`DROP TABLE IF EXISTS "${dataSource}"`);
    }

    /*
        This ensures we have the columns necessary for the application to function
        MUST come after we check for errors so that we can rely on the table
        to at least be valid before modifying it further
    */
    protected async addRequiredColumns(name: string): Promise<void> {
        const dataSourceColumns = await this.getColumnsOnDataSource(name);
        if (!dataSourceColumns.has("File ID")) {
            await this.execute(`
                ALTER TABLE "${name}"
                ADD COLUMN IF NOT EXISTS "File ID" VARCHAR;
            `);
            // The data source's input date gets appended to the end
            // of the auto-generated name, that makes it kind of messy
            // as an ID though so here lets remove it
            const dataSourceNameWithoutDate = name.split(" ")[0];
            // Auto-generates a File ID based on the row number when
            // ordered by file path.
            await this.execute(`
                UPDATE "${name}"
                SET "File ID" = CONCAT(SQ.row, '-', '${dataSourceNameWithoutDate}')
                FROM (
                    SELECT "File Path", ROW_NUMBER() OVER (ORDER BY "File Path") AS row
                    FROM "${name}"
                ) AS SQ
                WHERE "${name}"."File Path" = SQ."File Path";
            `);
        }

        if (!dataSourceColumns.has("File Name")) {
            await this.execute(`
                ALTER TABLE "${name}"
                ADD COLUMN IF NOT EXISTS "File Name" VARCHAR;
            `);
            // Best shot attempt at auto-generating a "File Name"
            // from the "File Path", defaults to full path if this fails
            await this.execute(`
                UPDATE "${name}"
                SET "File Name" = COALESCE(
                    NULLIF(
                        REGEXP_REPLACE(
                            "File Path",
                            '^.*/([^/]*?)(\\.[^/.]+)?$', '\\1',
                            ''
                        ),
                    ''),
                "File Path");
            `);
        }

        // Because we edited the column names this cache is now invalid
        this.dataSourceToAnnotationsMap.delete(name);
    }

    /*
        Checks the data source for unexpected formatting or issues in
        the expectations around uniqueness/blankness for pre-defined columns
        like "File Path", "File ID", etc.
    */
    protected async checkDataSourceForErrors(name: string): Promise<string[]> {
        const errors: string[] = [];
        const columnsOnTable = await this.getColumnsOnDataSource(name);

        // If a data source has a File ID it must also pass validation
        const hasFileIdColumn = columnsOnTable.has("File ID");
        if (hasFileIdColumn) {
            // Check for empty or just whitespace File ID column values
            const blankFileIdRows = await this.getRowsWhereColumnIsBlank(name, "File ID");
            if (blankFileIdRows.length > 0) {
                const rowNumbers = DatabaseService.truncateString(blankFileIdRows.join(", "), 100);
                errors.push(
                    `"File ID" column contains ${blankFileIdRows.length} empty or purely whitespace values at rows ${rowNumbers}.`
                );
            }

            // Check for duplicate File ID column values
            const duplicateFileIdRows = await this.getRowsWhereColumnIsNotUniqueOrBlank(
                name,
                "File ID"
            );
            if (duplicateFileIdRows.length > 0) {
                const rowNumbers = DatabaseService.truncateString(
                    duplicateFileIdRows.join(", "),
                    100
                );
                errors.push(
                    `"File ID" column contains duplicates. Found ${duplicateFileIdRows.length} duplicate values at rows ${rowNumbers}.`
                );
            }
        }

        if (!columnsOnTable.has("File Path")) {
            let error =
                '\
                "File Path" column is missing in the data source. \
                Check the data source header row for a "File Path" column name and try again.';

            // Attempt to find a column with a similar name to "File Path"
            const columns = Array.from(columnsOnTable);
            // TODO: In addition to doing this, on ingestion detect "file_path", "file path", etc.
            // and convert to "File Path" in DB table
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
            const blankFilePathRows = await this.getRowsWhereColumnIsBlank(name, "File Path");
            if (blankFilePathRows.length > 0) {
                const rowNumbers = DatabaseService.truncateString(
                    blankFilePathRows.join(", "),
                    100
                );
                errors.push(
                    `"File Path" column contains ${blankFilePathRows.length} empty or purely whitespace values at rows ${rowNumbers}.`
                );
            }

            // "File Path" has to be unique when a unique File ID is not provided
            // otherwise we can't cleanly auto-generate a File ID based on the File Path
            if (!hasFileIdColumn) {
                // Check for duplicate File ID column values
                const duplicateFilePathRows = await this.getRowsWhereColumnIsNotUniqueOrBlank(
                    name,
                    "File Path"
                );
                if (duplicateFilePathRows.length > 0) {
                    const rowNumbers = DatabaseService.truncateString(
                        duplicateFilePathRows.join(", "),
                        100
                    );
                    errors.push(
                        `"File Path" column contains duplicates, but has no "File ID" column to use as a unique identifier instead. Add a unique "File ID" column or make "File Path" values unique. Found ${duplicateFilePathRows.length} duplicate values at rows ${rowNumbers}.`
                    );
                }
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

        for (const preDefinedColumn of PRE_DEFINED_COLUMNS) {
            // Filter out any pre-defined columns that are exact matches to columns on the data source
            // since those are already perfect
            if (!columnsOnDataSource.has(preDefinedColumn)) {
                const preDefinedColumnSimplified = preDefinedColumn.toLowerCase().replace(" ", "");

                // Grab near matches to the pre-defined columns like "file_name" for "File Name"
                const matches = [...columnsOnDataSource].filter((column) => {
                    const simplifiedColumn = column
                        .toLowerCase() // File Name -> file name
                        .replaceAll(/\s|-|_/g, ""); // Matches any whitespace, hyphen, or underscore
                    return simplifiedColumn === preDefinedColumnSimplified;
                });

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
                    // Rename matching column name to new pre-defined column
                    await this.execute(`
                        ALTER TABLE "${dataSourceName}"
                        RENAME COLUMN "${matches[0]}" TO '${preDefinedColumn}'
                    `);
                }
            }
        }

        // Because we edited the column names this cache is now invalid
        this.dataSourceToAnnotationsMap.delete(dataSourceName);
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

    private async getRowsWhereColumnIsNotUniqueOrBlank(
        dataSource: string,
        column: string
    ): Promise<number[]> {
        const duplicateColumnQueryResult = await this.query(`
            SELECT ROW_NUMBER() OVER () AS row        
            FROM "${dataSource}"            
            WHERE "${column}" IN (
                SELECT "${column}"
                FROM "${dataSource}"
                WHERE TRIM("${column}") IS NOT NULL
                GROUP BY "${column}"
                HAVING COUNT(*) > 1
            )
        `);
        return duplicateColumnQueryResult.map((row) => row.row);
    }

    // TODO: Triple check this is going to work still...
    private async aggregateDataSources(dataSources: Source[]): Promise<void> {
        const viewName = dataSources
            .map((source) => source.name)
            .sort()
            .join(", ");

        if (this.currentAggregateSource) {
            // Prevent adding the same data source multiple times by shortcutting out here
            if (this.currentAggregateSource === viewName) {
                return;
            }

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
    }

    public async fetchAnnotations(dataSourceNames: string[]): Promise<Annotation[]> {
        const aggregateDataSourceName = dataSourceNames.sort().join(", ");
        if (!this.dataSourceToAnnotationsMap.has(aggregateDataSourceName)) {
            const sql = new SQLBuilder()
                .select("column_name, data_type")
                .from('information_schema"."columns')
                .where(`table_name = '${aggregateDataSourceName}'`)
                .toSQL();
            const rows = await this.query(sql);
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
                        isOpenFileLink:
                            annotationNameToTypeMap[row["column_name"]] ===
                            DatabaseService.OPEN_FILE_LINK_TYPE,
                        type:
                            annotationNameToTypeMap[row["column_name"]] ===
                            DatabaseService.OPEN_FILE_LINK_TYPE
                                ? AnnotationType.STRING
                                : annotationNameToTypeMap[row["column_name"]] ||
                                  DatabaseService.columnTypeToAnnotationType(row["data_type"]),
                    })
            );
            this.dataSourceToAnnotationsMap.set(aggregateDataSourceName, annotations);
        }

        return this.dataSourceToAnnotationsMap.get(aggregateDataSourceName) || [];
    }

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

    private async fetchAnnotationTypes(): Promise<Record<string, string>> {
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
}
