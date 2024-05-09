import CsvService, { CsvManifestRequest } from "..";
import SQLBuilder from "../../../entity/SQLBuilder";
import DatabaseService from "../../DatabaseService";
import { ConnectionConfig } from "../../HttpServiceBase";

interface Config extends ConnectionConfig {
    dataSourceName?: string;
    databaseService: DatabaseService;
}

/**
 * Service responsible for requesting a CSV manifest of metadata for selected files from the
 * DuckDB database.
 */
export default class DatabaseCsvService implements CsvService {
    private readonly databaseService: DatabaseService;
    private readonly dataSourceName?: string;

    public constructor(config: Config) {
        this.dataSourceName = config.dataSourceName;
        this.databaseService = config.databaseService;
    }

    public async getCsvAsBytes(selectionRequest: CsvManifestRequest): Promise<Uint8Array> {
        const { annotations, selections } = selectionRequest;
        if (!this.dataSourceName) {
            throw new Error("blah")
        }
        // TODO: use file id
        // TODO: Automatically generate file id on startup of db if not present in source
        const sqlBuilder = new SQLBuilder()
            .select(annotations.map((annotation) => `'${annotation}'`).join(', '))
            .from(this.dataSourceName)

        if (!this.dataSourceName) {
            throw new Error("blah")
        }
        selections.forEach((selection) => {
            selection.indexRanges.forEach((indexRange) => {
                const subQuery = new SQLBuilder()
                    .select("'File Path'")
                    .from(this.dataSourceName as string)
                    .whereOr(Object.entries(selection.filters).map(([column, values]) => {
                        const commaSeperatedValues = values.map(v => `'${v}'`).join(", ");
                        return `'${column}' IN (${commaSeperatedValues}}`;
                    }))
                    .offset(indexRange.start)
                    .limit(indexRange.end - indexRange.start);

                if (selection.sort) {
                    subQuery.orderBy(`'${selection.sort.annotationName}' (${selection.sort.ascending ? "ASC" : "DESC"})`);
                }

                sqlBuilder.whereOr(`'File Path' IN (${subQuery})`)
            });
        });
        return this.databaseService.saveQueryAsBuffer(
            sqlBuilder.toSQL()
        );
    }

    // public async download(
    //     selectionRequest: CsvManifestRequest,
    //     manifestDownloadId: string
    // ): Promise<DownloadResult> {
    //     if (!this.dataSourceName) {
    //         throw new Error("blah")
    //     }
    //     const saveLocation = await this.downloadService.promptForSaveLocation(
    //         "Save CSV",
    //         "fms-explorer-selections.csv",
    //         "Save CSV",
    //         [{ name: "CSV files", extensions: ["csv"] }]
    //     );
    //     if (saveLocation === FileDownloadCancellationToken) {
    //         return {
    //             downloadRequestId: manifestDownloadId,
    //             msg: `Cancelled download`,
    //             resolution: DownloadResolution.CANCELLED,
    //         };
    //     }

    //     const annotationsAsSelect = selectionRequest.annotations
    //         .map((annotation) => `"${annotation}"`)
    //         .join(", ");

    //     const rowNumberKey = "row_number";
    //     const subQueries = selectionRequest.selections.map((selection) => {
    //         const numberRangeAsWhereConditions = selection.indexRanges.map(
    //             (indexRange) =>
    //                 `"${rowNumberKey}" BETWEEN ${indexRange.start} AND ${indexRange.end}`
    //         );

    //         let filtersAsWhereClause = "";
    //         const columnNames = Object.keys(selection.filters);
    //         if (!!columnNames.length) {
    //             const filtersAsWhereConditions = columnNames.map((columnName) =>
    //                 selection.filters[columnName]
    //                     .map((columnValue) => `"${columnName}" = '${columnValue}'`)
    //                     .join(" OR ")
    //             );
    //             filtersAsWhereClause = `WHERE (${filtersAsWhereConditions.join(") AND (")})`;
    //         }

    //         let orderByClause = "";
    //         if (selection.sort) {
    //             orderByClause = `ORDER BY "${selection.sort.annotationName}" ${
    //                 selection.sort.ascending ? "ASC" : "DESC"
    //             }`;
    //         }

    //         return `
    //             SELECT "File Path"
    //             FROM (
    //                 SELECT ROW_NUMBER() OVER (${orderByClause}) AS "${rowNumberKey}", "File Path"
    //                 FROM ${this.dataSourceName}
    //                 ${filtersAsWhereClause}
    //             ) AS Row
    //             WHERE (${numberRangeAsWhereConditions.join(") OR (")})
    //             ${orderByClause}
    //         `;
    //     }, [] as string[]);

    //     // TODO: This should be cancellable, but moving this to be
    //     // web compatible would by default make that true
    //     // https://github.com/AllenInstitute/aics-fms-file-explorer-app/issues/62
    //     const sql = `
    //         COPY (
    //             SELECT ${annotationsAsSelect}
    //             FROM ${this.dataSourceName} 
    //             WHERE "File Path" IN (
    //                 ${subQueries.join(") OR (")}
    //             )
    //         )
    //         TO '${saveLocation}' (HEADER, DELIMITER ',');
    //     `;

    //     await this.databaseService.query(sql);
    //     return {
    //         downloadRequestId: manifestDownloadId,
    //         msg: `CSV downloaded to ${saveLocation}`,
    //         resolution: DownloadResolution.SUCCESS,
    //     };
    // }
}
