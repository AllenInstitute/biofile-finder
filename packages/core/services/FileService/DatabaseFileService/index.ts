import { omit } from "lodash";

import FileService, { GetFilesRequest, SelectionAggregationResult } from "..";
import DatabaseService from "../../DatabaseService";
import DatabaseServiceNoop from "../../DatabaseService/DatabaseServiceNoop";
import FileSelection from "../../../entity/FileSelection";
import FileSet from "../../../entity/FileSet";
import FileDetail from "../../../entity/FileDetail";

interface Config {
    databaseService: DatabaseService;
}

/**
 * Service responsible for fetching file related metadata directly from a database.
 */
export default class DatabaseFileService implements FileService {
    private readonly databaseService: DatabaseService;

    private static convertDatabaseRowToFileDetail(
        row: { [key: string]: string },
        rowNumber: number
    ): FileDetail {
        const filePath = row["File Path"];
        if (!filePath) {
            throw new Error('"File Path" (case-sensitive) is a required column for data sources');
        }

        const annotations = [];
        annotations.push({ name: "File Path", values: [filePath] });
        const fileName =
            row["File Name"] || filePath.split("\\").pop()?.split("/").pop() || filePath;
        annotations.push({ name: "File Name", values: [fileName] });
        annotations.push({ name: "File ID", values: [row["File ID"] || `${rowNumber}`] });
        if (row["File Size"] !== undefined && row["File Size"] !== null) {
            annotations.push({ name: "File Size", values: [row["File Size"]] });
        }
        annotations.push({ name: "File Size", values: [row["File ID"] || `${rowNumber}`] });
        if (row["Thumbnail"]) {
            annotations.push({ name: "Thumbnail", values: [row["Thumbnail"]] });
        }
        if (row["Uploaded"]) {
            annotations.push({ name: "Uploaded", values: [row["Uploaded"]] });
        }
        return new FileDetail({
            annotations: [
                ...annotations,
                ...Object.entries(omit(row, ...annotations.keys())).map(([name, values]: any) => ({
                    name,
                    values: `${values}`.split(",").map((value: string) => value.trim()),
                })),
            ],
        });
    }

    constructor(config: Config = { databaseService: new DatabaseServiceNoop() }) {
        this.databaseService = config.databaseService;
    }

    public async getCountOfMatchingFiles(fileSet: FileSet): Promise<number> {
        const select_key = "num_files";
        const sql = fileSet
            .toQuerySQLBuilder()
            .select(`COUNT(*) AS ${select_key}`)
            .from(this.databaseService.table)
            // Remove sort if present
            .orderBy()
            .toSQL();
        const rows = await this.databaseService.query(sql);
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
        const sql = request.fileSet
            .toQuerySQLBuilder()
            .from(this.databaseService.table)
            .offset(request.from * request.limit)
            .limit(request.limit)
            .toSQL();
        const rows = await this.databaseService.query(sql);
        return rows.map((row, index) =>
            DatabaseFileService.convertDatabaseRowToFileDetail(
                row,
                index + request.from * request.limit
            )
        );
    }
}
