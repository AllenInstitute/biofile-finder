import { omit, pick } from "lodash";

import FileService, { FmsFile, GetFilesRequest, SelectionAggregationResult } from "..";
import DatabaseService from "../../DatabaseService";
import DatabaseServiceNoop from "../../DatabaseService/DatabaseServiceNoop";
import FileSelection from "../../../entity/FileSelection";
import FileSet from "../../../entity/FileSet";
import { TOP_LEVEL_FILE_ANNOTATION_NAMES } from "../../../constants";

interface Config {
    database: DatabaseService;
}

/**
 * Service responsible for fetching file related metadata.
 */
export default class DatabaseFileService implements FileService {
    private readonly database: DatabaseService;

    constructor(config: Config = { database: new DatabaseServiceNoop() }) {
        this.database = config.database;
    }

    public async getCountOfMatchingFiles(fileSet: FileSet): Promise<number> {
        const select_key = "num_files";
        const sql = `\
            SELECT COUNT(*) AS ${select_key}     \
            FROM ${this.database.table}          \
            ${fileSet.toQuerySQL({ ignoreSort: true })}
        `;
        const rows = await this.database.query(sql);
        return parseInt(rows[0][select_key], 10);
    }

    public async getAggregateInformation(
        fileSelection: FileSelection
    ): Promise<SelectionAggregationResult> {
        const allFiles = await fileSelection.fetchAllDetails();
        const size = allFiles.reduce((acc, file) => acc + file.file_size, 0);
        return { count: fileSelection.count(), size };
    }

    /**
     * Get list of file documents that match a given filter, potentially according to a particular sort order,
     * and potentially starting from a particular file_id and limited to a set number of files.
     */
    public async getFiles(request: GetFilesRequest): Promise<FmsFile[]> {
        const sql = `                               \
            SELECT *                                \
            FROM ${this.database.table}             \
            ${request.fileSet.toQuerySQL()}         \
            OFFSET ${request.from * request.limit}  \
            LIMIT ${request.limit}
        `;
        const rows = await this.database.query(sql);
        // TODO: ideally stop doing this mapping
        return rows.map((row) => ({
            ...pick(row, TOP_LEVEL_FILE_ANNOTATION_NAMES),
            annotations: Object.entries(omit(row, TOP_LEVEL_FILE_ANNOTATION_NAMES)).map(
                ([name, values]: any) => ({
                    name,
                    values: `${values}`.split(",").map((value: string) => value.trim()),
                })
            ),
        })) as FmsFile[];
    }
}
