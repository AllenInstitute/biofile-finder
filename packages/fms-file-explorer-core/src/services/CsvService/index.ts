import { find, omit } from "lodash";
import FileService from "../FileService";
import Annotation from "../../entity/Annotation";
import HttpServiceBase, { ConnectionConfig } from "../HttpServiceBase";

interface CsvServiceConfig extends ConnectionConfig {
    fileService?: FileService;
}

/**
 * GM 1/27/2020: This is very temporary! It will move to the backend. There are no tests because
 * it will be deleted within a couple weeks. It is essentially proof of concept behavior to give to stakeholders
 * to get a sense of the look and feel.
 */
export default class CsvService extends HttpServiceBase {
    private readonly NEW_LINE = "\n";
    private readonly INTER_COLUMN_SEPARATOR = ","; // csv file, duh
    private readonly INTRA_COLUMN_SEPARATOR = " | "; // when a file has more than one value for a given column; TODO, do better.
    private readonly MISSING_VALUE = " ";
    private readonly FILE_METADATA_KEYS = [
        "fileId",
        "filePath",
        "fileSize",
        "fileType",
        "thumbnailPath",
        "uploaded",
        "uploadedBy",
    ];
    private readonly fileService: FileService;

    public constructor(config: CsvServiceConfig) {
        super(omit(config, ["fileService"]));

        this.fileService = config.fileService || new FileService(omit(config, ["fileService"]));
    }

    public async downloadCsv(fileIds: string[], annotations: Annotation[]): Promise<void> {
        const files = await this.fileService.getFilesById(fileIds);

        // pass through all files and determine annotation keys
        const columns = new Set(this.FILE_METADATA_KEYS);
        for (const annotation of annotations) {
            columns.add(annotation.name);
        }

        // build up CSV string starting from the header columns then iterating over
        // each file.
        const header = Array.from(columns).join(this.INTER_COLUMN_SEPARATOR);
        let csv = `${header}${this.NEW_LINE}`;

        for (const file of files) {
            for (const column of columns) {
                const correspondingAnnotation = find(
                    annotations,
                    (annotation) => annotation.name === column
                );
                if (correspondingAnnotation) {
                    const values = correspondingAnnotation
                        .extractFromFile(file)
                        .split(Annotation.SEPARATOR);
                    const stringified = values.join(this.INTRA_COLUMN_SEPARATOR);
                    csv += stringified;
                } else if (file.hasOwnProperty(column)) {
                    csv += `${file[column]}`;
                } else {
                    csv += this.MISSING_VALUE;
                }
                csv += this.INTER_COLUMN_SEPARATOR;
            }
            csv += this.NEW_LINE;
        }

        // download the file
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "manifest.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
