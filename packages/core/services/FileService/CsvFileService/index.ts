import { omit, pick } from "lodash";

import FileService, { FmsFile, GetFilesRequest } from "..";
import CsvDatabaseService from "../../CsvDatabaseService";
import CsvDatabaseServiceNoop from "../../CsvDatabaseService/CsvDatabaseServiceNoop";
import { ConnectionConfig } from "../../HttpServiceBase";
import RestServiceResponse from "../../../entity/RestServiceResponse";
import FileSelection from "../../../entity/FileSelection";

interface SelectionAggregationResult {
    count: number;
    size: number;
}

interface CsvAnnotationServiceConfig extends ConnectionConfig {
    database: CsvDatabaseService;
}

const SORT_SENTINAL_VALUE = "sort";
/**
 * Service responsible for fetching file related metadata.
 */
export default class CsvFileService extends FileService {
    private database: CsvDatabaseService;

    private static translateQueryStringToSQLClause(
        queryString: string,
        from?: number,
        limit?: number
    ): string {
        // const queryCell Line=blah&sort=Uploaded(ASC)
        // ex. "Cell Line=blah&sort=Uploaded(ASC)"
        const queryParts = queryString.split("&");
        const whereClauseParts: string[] = [];
        let orderByClause = "";
        queryParts.forEach((queryPart) => {
            const [annotationName, annotationValue] = queryPart.split("=");
            if (annotationName === SORT_SENTINAL_VALUE) {
                const [annotationName, sortDirection] = annotationValue.slice(0, -1).split("(");
                orderByClause = ` ORDER BY "${annotationName}" ${sortDirection}`;
            } else {
                whereClauseParts.push(`"${annotationName}" = '${annotationValue}'`);
            }
        });
        let sql = "";
        if (whereClauseParts.length) {
            sql += ` WHERE ${whereClauseParts.join(" AND ")} `;
        }
        if (orderByClause) {
            sql += orderByClause;
        }
        if (from !== undefined && limit !== undefined) {
            sql += ` LIMIT ${limit} OFFSET ${from * limit}`;
        }
        return sql;
    }

    constructor(config: CsvAnnotationServiceConfig = { database: new CsvDatabaseServiceNoop() }) {
        super(config);
        this.database = config.database;
    }

    public async getCountOfMatchingFiles(queryString: string): Promise<number> {
        const count_key = "num_files";
        const sql = `\
            SELECT COUNT(*) AS ${count_key} \
            FROM new_tbl    \
            ${CsvFileService.translateQueryStringToSQLClause(queryString).split("ORDER BY")[0]}
        `;
        const response = await this.database.query(sql);
        return parseInt(response[0][count_key], 10);
    }

    public async getAggregateInformation(
        fileSelection: FileSelection
    ): Promise<SelectionAggregationResult> {
        let size = 0;
        for (const file of await fileSelection.fetchAllDetails()) {
            size += file.file_size;
        }
        return { count: fileSelection.count(), size };
    }

    /**
     * Get list of file documents that match a given filter, potentially according to a particular sort order,
     * and potentially starting from a particular file_id and limited to a set number of files.
     */
    public async getFiles(request: GetFilesRequest): Promise<RestServiceResponse<FmsFile>> {
        const fileProperties = [
            "file_id",
            "file_name",
            "file_path",
            "file_size",
            "uploaded",
            "thumbnail",
        ];
        const sql = `\
            SELECT * \
            FROM new_tbl    \
            ${CsvFileService.translateQueryStringToSQLClause(
                request.queryString,
                request.from,
                request.limit
            )}
        `;
        const rows = await this.database.query(sql);
        const files = rows.map((row) => ({
            ...pick(row, fileProperties),
            annotations: Object.entries(omit(row, fileProperties)).map(([name, values]: any) => ({
                name,
                values: `${values}`.split(",").map((value: string) => value.trim()),
            })),
        })) as FmsFile[];
        return new RestServiceResponse<FmsFile>({
            data: files,
            offset: request.from * request.limit,
            responseType: "",
        });
    }
}
