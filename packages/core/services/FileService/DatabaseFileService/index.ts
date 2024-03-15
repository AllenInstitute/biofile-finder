import { omit } from "lodash";

import FileService, { FmsFile, GetFilesRequest, SelectionAggregationResult } from "..";
import DatabaseService from "../../DatabaseService";
import DatabaseServiceNoop from "../../DatabaseService/DatabaseServiceNoop";
import FileSelection from "../../../entity/FileSelection";
import FileSet from "../../../entity/FileSet";
import { TOP_LEVEL_FILE_ANNOTATION_NAMES_WITH_MULTIPLE_CASINGS } from "../../constants";

interface Config {
    databaseService: DatabaseService;
}

/**
 * Service responsible for fetching file related metadata directly from a database.
 */
export default class DatabaseFileService implements FileService {
    private readonly databaseService: DatabaseService;

    private static convertDatabaseRowToFmsFile(
        row: { [key: string]: string },
        rowNumber: number
    ): FmsFile {
        const filePath = row["File Path"] || row["file_path"];
        if (!filePath) {
            throw new Error('"File Path" (or "file_path") is a required column for data sources');
        }

        const fileSize = row["File Size"] || row["file_size"];
        return {
            file_id: row["File ID"] || row["File Id"] || row["file_id"] || `${rowNumber}`,
            file_name: 
                row["File Name"] ||
                row["file_name"] ||
                filePath.split("\\").pop()?.split("/").pop() ||
                filePath,
            file_path: filePath,
            file_size: (fileSize !== undefined && fileSize !== null) ? parseInt(fileSize, 10) : undefined,
            uploaded: row["Uploaded"] || row["uploaded"],
            thumbnail: row["Thumbnail"] || row["thumbnail"],
            annotations: Object.entries(omit(row, ...TOP_LEVEL_FILE_ANNOTATION_NAMES_WITH_MULTIPLE_CASINGS)).map(
                ([name, values]: any) => ({
                    name,
                    values: `${values}`.split(",").map((value: string) => value.trim()),
                })
            ),
        };
    }

    constructor(config: Config = { databaseService: new DatabaseServiceNoop() }) {
        this.databaseService = config.databaseService;
    }

    public async getCountOfMatchingFiles(fileSet: FileSet): Promise<number> {
        const select_key = "num_files";
        const sql = `\
            SELECT COUNT(*) AS ${select_key}     \
            FROM ${this.databaseService.table}          \
            ${fileSet.toQuerySQL({ ignoreSort: true })}
        `;
        const rows = await this.databaseService.query(sql);
        return parseInt(rows[0][select_key], 10);
    }

    public async getAggregateInformation(
        fileSelection: FileSelection
    ): Promise<SelectionAggregationResult> {
        const allFiles = await fileSelection.fetchAllDetails();
        const count = fileSelection.count();
        if (allFiles.length && allFiles[0].file_size === undefined) {
            return { count };
        }
        const size = allFiles.reduce((acc, file) => acc + (file.file_size || 0), 0);
        return { count, size };
    }

    /**
     * Get list of file documents that match a given filter, potentially according to a particular sort order,
     * and potentially starting from a particular file_id and limited to a set number of files.
     */
    public async getFiles(request: GetFilesRequest): Promise<FmsFile[]> {
        const sql = `                               \
            SELECT *                                \
            FROM ${this.databaseService.table}             \
            ${request.fileSet.toQuerySQL()}         \
            OFFSET ${request.from * request.limit}  \
            LIMIT ${request.limit}
        `;
        const rows = await this.databaseService.query(sql);
        return rows.map((row, index) =>
            DatabaseFileService.convertDatabaseRowToFmsFile(
                row,
                index + request.from * request.limit
            )
        ) as FmsFile[];
    }
}
