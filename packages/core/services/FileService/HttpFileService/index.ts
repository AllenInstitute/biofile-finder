import { chunk, compact, invert, join, uniqueId } from "lodash";

import FileService, {
    GetFilesRequest,
    SelectionAggregationResult,
    Selection,
    AnnotationNameToValuesMap,
} from "..";
import { AnnotationValue } from "../../AnnotationService";
import FileDownloadService, { DownloadResult } from "../../FileDownloadService";
import FileDownloadServiceNoop from "../../FileDownloadService/FileDownloadServiceNoop";
import HttpServiceBase, { ConnectionConfig } from "../../HttpServiceBase";
import FileSelection from "../../../entity/FileSelection";
import FileSet from "../../../entity/FileSet";
import FileDetail, { FmsFile } from "../../../entity/FileDetail";

interface SelectionAggregationRequest {
    selections: Selection[];
}

interface Config extends ConnectionConfig {
    downloadService: FileDownloadService;
}

// Used for the GET request to MMS for file metadata
interface EdittableFileMetadata {
    fileId: string;
    annotations?: {
        annotationId: number;
        values: string[];
    }[];
    templateId?: number;
}

/**
 * Service responsible for fetching file related metadata.
 */
export default class HttpFileService extends HttpServiceBase implements FileService {
    private static readonly ENDPOINT_VERSION = "3.0";
    public static readonly BASE_FILES_URL = `file-explorer-service/${HttpFileService.ENDPOINT_VERSION}/files`;
    public static readonly BASE_FILE_COUNT_URL = `${HttpFileService.BASE_FILES_URL}/count`;
    public static readonly BASE_EDIT_FILES_URL = `metadata-management-service/1.0/filemetadata`;
    public static readonly BASE_ANNOTATION_ID_URL = `metadata-management-service/1.0/annotation`;
    public static readonly SELECTION_AGGREGATE_URL = `${HttpFileService.BASE_FILES_URL}/selection/aggregate`;
    private static readonly CSV_ENDPOINT_VERSION = "2.0";
    public static readonly BASE_CSV_DOWNLOAD_URL = `file-explorer-service/${HttpFileService.CSV_ENDPOINT_VERSION}/files/selection/manifest`;
    private readonly downloadService: FileDownloadService;
    private readonly edittableAnnotationIdToNameCache: { [name: string]: number } = {};

    constructor(config: Config = { downloadService: new FileDownloadServiceNoop() }) {
        super(config);
        this.downloadService = config.downloadService;
    }

    /**
     * Basic check to see if the network is accessible by attempting to fetch the file explorer service base url
     */
    public async isNetworkAccessible(): Promise<boolean> {
        try {
            await this.get(`${this.baseUrl}/${HttpFileService.BASE_FILE_COUNT_URL}`);
            return true;
        } catch (error) {
            console.error(`Unable to access AICS network ${error}`);
            return false;
        }
    }

    public async getCountOfMatchingFiles(fileSet: FileSet): Promise<number> {
        const requestUrl = join(
            compact([
                `${this.baseUrl}/${HttpFileService.BASE_FILE_COUNT_URL}${this.pathSuffix}`,
                fileSet.toQueryString(),
            ]),
            "?"
        );

        const response = await this.get<number>(requestUrl);

        // data is always an array, this endpoint should always return an array of length 1
        if (response.data.length !== 1) {
            throw new Error(`Expected response.data of ${requestUrl} to contain a single count`);
        }

        return response.data[0];
    }

    public async getAggregateInformation(
        fileSelection: FileSelection
    ): Promise<SelectionAggregationResult> {
        const selections = fileSelection.toCompactSelectionList();
        const postBody: SelectionAggregationRequest = { selections };
        const requestUrl = `${this.baseUrl}/${HttpFileService.SELECTION_AGGREGATE_URL}${this.pathSuffix}`;

        const response = await this.post<SelectionAggregationResult>(
            requestUrl,
            JSON.stringify(postBody)
        );

        // data is always an array, this endpoint should always return an array of length 1
        if (response.data.length !== 1) {
            throw new Error(`Expected response.data of ${postBody} to contain a single count`);
        }
        return response.data[0];
    }

    /**
     * Get list of file documents that match a given filter, potentially according to a particular sort order,
     * and potentially starting from a particular file_id and limited to a set number of files.
     */
    public async getFiles(request: GetFilesRequest): Promise<FileDetail[]> {
        const { from, limit, fileSet } = request;

        const base = `${this.baseUrl}/${HttpFileService.BASE_FILES_URL}${this.pathSuffix}?from=${from}&limit=${limit}`;
        const requestUrl = join(compact([base, fileSet.toQueryString()]), "&");

        const response = await this.get<FmsFile>(requestUrl);
        return response.data.map((file) => new FileDetail(file));
    }

    /**
     * Download the given file selection query to local storage in the given format
     */
    public async download(
        annotations: string[],
        selections: Selection[],
        format: "csv" | "json" | "parquet"
    ): Promise<DownloadResult> {
        if (format !== "csv") {
            throw new Error(
                "Only CSV download is supported at this time for downloading from AICS FMS"
            );
        }

        const postData = JSON.stringify({ annotations, selections });
        const url = `${this.baseUrl}/${HttpFileService.BASE_CSV_DOWNLOAD_URL}${this.pathSuffix}`;

        const manifest = await this.downloadService.prepareHttpResourceForDownload(url, postData);
        const name = `file-manifest-${new Date()}.csv`;
        return this.downloadService.download(
            {
                name,
                id: name,
                path: url,
                data: manifest,
            },
            uniqueId()
        );
    }

    public async editFile(fileId: string, annotations: AnnotationNameToValuesMap): Promise<void> {
        const url = `${this.baseUrl}/${HttpFileService.BASE_EDIT_FILES_URL}/${fileId}`;
        const mmsAnnotations: { annotationId: number; values: AnnotationValue[] }[] = [];
        for (const [name, values] of Object.entries(annotations)) {
            const annotationId = await this.getEdittableAnnotationIdByName(name);
            mmsAnnotations.push({ annotationId, values });
        }
        const requestBody = JSON.stringify({
            annotations: mmsAnnotations,
        });
        await this.put(url, requestBody);
    }

    public async getEdittableFileMetadata(
        fileIds: string[]
    ): Promise<{ [fileId: string]: AnnotationNameToValuesMap }> {
        const url = `${this.baseUrl}/${HttpFileService.BASE_EDIT_FILES_URL}/${fileIds.join(",")}`;
        const response = await this.get<EdittableFileMetadata>(url);

        const fileIdToAnnotations: { [fileId: string]: AnnotationNameToValuesMap } = {};
        for (const file of response.data) {
            fileIdToAnnotations[file.fileId] = {};
            for (const annotation of file.annotations || []) {
                const name = await this.getEdittableAnnotationNameById(annotation.annotationId);
                fileIdToAnnotations[file.fileId][name] = annotation.values;
            }
        }
        return fileIdToAnnotations;
    }

    /**
     * For every annotation name given, fetch the annotation id from MMS and cache it
     * for future in edit scenarios, necessary because we don't have an endpoint in MMS
     * that can grab the annotation name from the annotation id
     */
    public async prepareAnnotationIdCache(annotationNames: string[]): Promise<void> {
        const batches = chunk(annotationNames, 25);
        for (const batch of batches) {
            await Promise.all(batch.map((name) => this.getEdittableAnnotationIdByName(name)));
        }
    }

    private async getEdittableAnnotationIdByName(name: string): Promise<number> {
        if (!this.edittableAnnotationIdToNameCache[name]) {
            const url = `${this.baseUrl}/${HttpFileService.BASE_ANNOTATION_ID_URL}/${name}`;
            const response = await this.get<{ annotationId: number }>(url);

            this.edittableAnnotationIdToNameCache[name] = response.data[0].annotationId;
        }

        return this.edittableAnnotationIdToNameCache[name];
    }

    private async getEdittableAnnotationNameById(id: number): Promise<string> {
        const edittableAnnotationNameToIdCache = invert(this.edittableAnnotationIdToNameCache);
        if (!edittableAnnotationNameToIdCache[id]) {
            throw new Error(
                `Unable to find annotation name for id ${id}. This should have been cached on app initialization.`
            );
        }

        return edittableAnnotationNameToIdCache[id];
    }
}
