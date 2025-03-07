import { isEmpty } from "lodash";

import { AICS_FMS_DATA_SOURCE_NAME } from "../../constants";
import Annotation from "../../entity/Annotation";
import { AnnotationType } from "../../entity/AnnotationFormatter";
import { Source } from "../../entity/FileExplorerURL";
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

/**
 * Service reponsible for querying against a database
 */
export default abstract class DatabaseService {
    public static readonly LIST_DELIMITER = ",";
    // Name of the hidden column BFF uses to uniquely identify rows
    public static readonly HIDDEN_UID_ANNOTATION = "hidden_bff_uid";
    protected readonly SOURCE_METADATA_TABLE = "source_metadata";
    // "Open file link" as a datatype must be hardcoded, and CAN NOT change
    // without BREAKING visibility in the dataset released in 2024 as part
    // of the EMT Data Release paper
    private static readonly OPEN_FILE_LINK_TYPE = "Open file link";
    private static readonly ANNOTATION_TYPE_SET = new Set([
        ...Object.values(AnnotationType),
        DatabaseService.OPEN_FILE_LINK_TYPE,
    ]);
    private sourceMetadataName?: string;
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

    public abstract execute(_sql: string): Promise<void>;

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

    public async deleteSourceMetadata(): Promise<void> {
        await this.deleteDataSource(this.SOURCE_METADATA_TABLE);
        this.dataSourceToAnnotationsMap.clear();
    }

    private async deleteDataSource(dataSource: string): Promise<void> {
        this.existingDataSources.delete(dataSource);
        this.dataSourceToAnnotationsMap.delete(dataSource);
        await this.execute(`DROP TABLE IF EXISTS "${dataSource}"`);
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
            // Altering tables to add primary keys or serially generated columns
            // isn't yet supported in DuckDB, so this does a serially generated
            // column addition manually
            `
                UPDATE "${name}"
                SET "${DatabaseService.HIDDEN_UID_ANNOTATION}" = SQ.row
                FROM (
                    SELECT "${PreDefinedColumn.FILE_PATH}", ROW_NUMBER() OVER (ORDER BY "${PreDefinedColumn.FILE_PATH}") AS row
                    FROM "${name}"
                ) AS SQ
                WHERE "${name}"."${PreDefinedColumn.FILE_PATH}" = SQ."${PreDefinedColumn.FILE_PATH}";
            `,
        ];

        const dataSourceColumns = await this.getColumnsOnDataSource(name);
        if (!dataSourceColumns.has(PreDefinedColumn.FILE_NAME)) {
            commandsToExecute.push(`
                ALTER TABLE "${name}"
                ADD COLUMN "${PreDefinedColumn.FILE_NAME}" VARCHAR;
            `);
            // Best shot attempt at auto-generating a "File Name"
            // from the "File Path", defaults to full path if this fails
            commandsToExecute.push(`
                UPDATE "${name}"
                SET "${PreDefinedColumn.FILE_NAME}" = COALESCE(
                    NULLIF(
                        REGEXP_REPLACE(
                            "${PreDefinedColumn.FILE_PATH}",
                            '^.*/([^/]*?)(\\.[^/.]+)?$', '\\1',
                            ''
                        ),
                    ''),
                "${PreDefinedColumn.FILE_PATH}");
            `);
        }

        await this.execute(commandsToExecute.join("; "));

        // Because we edited the column names this cache is now invalid
        this.dataSourceToAnnotationsMap.delete(name);
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

        const combinedAlterCommands = PRE_DEFINED_COLUMNS
            // Filter out any pre-defined columns that are exact matches to columns on the data source
            // since those are already perfect
            .filter((preDefinedColumn) => !columnsOnDataSource.has(preDefinedColumn))
            // Map the rest to SQL alter table commands to rename the columns
            .flatMap((preDefinedColumn) => {
                const preDefinedColumnSimplified = preDefinedColumn.toLowerCase().replace(" ", "");

                // Grab near matches to the pre-defined columns like "file_name" for "File Name"
                const matches = [...columnsOnDataSource].filter(
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

                if (matches.length < 1) {
                    return []; // No-op essentially if no matches
                }

                // Rename matching column name to new pre-defined column
                return [
                    `
                    ALTER TABLE "${dataSourceName}"
                    RENAME COLUMN "${matches[0]}" TO '${preDefinedColumn}'
                `,
                ];
            })
            .join("; ");

        if (combinedAlterCommands) {
            await this.execute(combinedAlterCommands);
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

    private async aggregateDataSources(dataSources: Source[]): Promise<void> {
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
                                : (annotationNameToTypeMap[row["column_name"]] as AnnotationType) ||
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
