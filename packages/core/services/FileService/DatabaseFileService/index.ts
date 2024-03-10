import { omit, pick } from "lodash";

import FileService, { FmsFile, GetFilesRequest, SelectionAggregationResult } from "..";
import DatabaseService from "../../DatabaseService";
import DatabaseServiceNoop from "../../DatabaseService/DatabaseServiceNoop";
import FileSelection from "../../../entity/FileSelection";
import FileSet from "../../../entity/FileSet";
import { TOP_LEVEL_FILE_ANNOTATION_NAMES } from "../../../constants";

interface Config {
    databaseService: DatabaseService;
}

/**
 * Service responsible for fetching file related metadata.
 */
export default class DatabaseFileService implements FileService {
    private readonly databaseService: DatabaseService;

    private static convertFilePropertyTyping(
        fileProperty: string,
        value: string
    ): Partial<FmsFile> {
        // TODO: Support other casings and such
        switch (fileProperty) {
            case "file_size":
                return { file_size: parseInt(value, 10) };
            // TODO: Dates should be cleaner and more consistent between this and FES
            // TODO: Could we get this cleaner from DuckDB??
            // case "uploaded":
            //     return { "uploaded": new Date().toDateString() }
            default:
                return { [fileProperty]: value };
        }
    }

    private static convertDatabaseRowToFmsFile(row: { [key: string]: string }): FmsFile {
        return Object.entries(row).reduce(
            (fmsFile: Partial<FmsFile>, [fileProperty, value]) => ({
                ...fmsFile,
                ...DatabaseFileService.convertFilePropertyTyping(fileProperty, value),
            }),
            {} as Partial<FmsFile>
        ) as FmsFile;
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
        // TODO: This should probably be optimized
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
            FROM ${this.databaseService.table}             \
            ${request.fileSet.toQuerySQL()}         \
            OFFSET ${request.from * request.limit}  \
            LIMIT ${request.limit}
        `;
        const rows = await this.databaseService.query(sql);
        // TODO: ideally stop doing this mapping
        return rows.map((row) => ({
            ...DatabaseFileService.convertDatabaseRowToFmsFile(
                pick(row, TOP_LEVEL_FILE_ANNOTATION_NAMES)
            ),
            annotations: Object.entries(omit(row, TOP_LEVEL_FILE_ANNOTATION_NAMES)).map(
                ([name, values]: any) => ({
                    name,
                    // TODO: Smarter types?
                    values: `${values}`.split(",").map((value: string) => value.trim()),
                })
            ),
        })) as FmsFile[];
    }
}
