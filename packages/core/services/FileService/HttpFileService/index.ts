import { compact, filter, join, map, uniqueId } from "lodash";

import FileService, {
    GetFilesRequest,
    SelectionAggregationResult,
    Selection,
    AnnotationNameToValuesMap,
} from "..";
import FileDownloadService, { DownloadResult } from "../../FileDownloadService";
import FileDownloadServiceNoop from "../../FileDownloadService/FileDownloadServiceNoop";
import HttpServiceBase, { ConnectionConfig } from "../../HttpServiceBase";
import Annotation from "../../../entity/Annotation";
import AnnotationName from "../../../entity/Annotation/AnnotationName";
import FileFilter from "../../../entity/FileFilter";
import FileSelection from "../../../entity/FileSelection";
import FileSet from "../../../entity/FileSet";
import FileDetail, { FmsFile } from "../../../entity/FileDetail";
import { JSONReadyRange } from "../../../entity/NumericRange";
import { FilterType } from "../../../entity/FileFilter";
import { SortOrder } from "../../../entity/FileSort";

// Interface expected by FES API
interface FESFileSelection {
    filters: {
        [filterName: string]: (string | number | boolean)[];
    };
    indexRanges: JSONReadyRange[];
    sort?: {
        annotationName: string;
        ascending: boolean;
    };
    fuzzy?: string[];
    exclude?: string[];
    include?: string[];
}

interface SelectionAggregationRequest {
    selections: FESFileSelection[];
}

interface Config extends ConnectionConfig {
    downloadService: FileDownloadService;
}

function simplifyCsvSelection(selections: Selection[]): FESFileSelection[] {
    return selections.map((selection) => ({
        filters: filter(
            selection.filters,
            (filter) => filter.type === FilterType.DEFAULT || filter.type === FilterType.FUZZY
        ).reduce(
            (acc, filter) => ({
                ...acc,
                [filter.name]: [...(acc[filter.name] || []), filter.value],
            }),
            {} as { [filterName: string]: (string | number | boolean)[] }
        ),
        indexRanges: selection.indexRanges,
        sort: selection.sort
            ? {
                  annotationName: selection.sort.annotationName,
                  ascending: selection.sort.order === SortOrder.ASC,
              }
            : undefined,
        fuzzy: map(
            filter(selection.filters, (filter) => filter.type === FilterType.FUZZY),
            "name"
        ).flat(),
        exclude: map(
            filter(selection.filters, (filter) => filter.type === FilterType.EXCLUDE),
            "name"
        ).flat(),
        include: map(
            filter(selection.filters, (filter) => filter.type === FilterType.ANY),
            "name"
        ).flat(),
    }));
}

/**
 * Service responsible for fetching file related metadata.
 */
export default class HttpFileService extends HttpServiceBase implements FileService {
    private static readonly CACHE_ENDPOINT_VERSION = "v3.0";
    private static readonly ENDPOINT_VERSION = "3.0";
    public static readonly BASE_FILES_URL = `file-explorer-service/${HttpFileService.ENDPOINT_VERSION}/files`;
    public static readonly BASE_FILE_COUNT_URL = `${HttpFileService.BASE_FILES_URL}/count`;
    public static readonly BASE_FILE_EDIT_URL = `metadata-management-service/1.0/filemetadata`;
    public static readonly BASE_FILE_CACHE_URL = `fss2/${HttpFileService.CACHE_ENDPOINT_VERSION}/file/cache`;
    public static readonly SELECTION_AGGREGATE_URL = `${HttpFileService.BASE_FILES_URL}/selection/aggregate`;
    private static readonly CSV_ENDPOINT_VERSION = "2.0";
    public static readonly BASE_CSV_DOWNLOAD_URL = `file-explorer-service/${HttpFileService.CSV_ENDPOINT_VERSION}/files/selection/manifest`;
    private readonly downloadService: FileDownloadService;

    constructor(config: Config = { downloadService: new FileDownloadServiceNoop() }) {
        super(config);
        this.downloadService = config.downloadService;
    }

    /**
     * Basic check to see if the network is accessible by attempting to fetch the file explorer service base url
     */
    public async isNetworkAccessible(): Promise<boolean> {
        try {
            await this.get(
                `${this.fileExplorerServiceBaseUrl}/${HttpFileService.BASE_FILE_COUNT_URL}`
            );
            return true;
        } catch (error) {
            console.debug(`Unable to access AICS network ${error}`);
            return false;
        }
    }

    public async getCountOfMatchingFiles(fileSet: FileSet): Promise<number> {
        const requestUrl = join(
            compact([
                `${this.fileExplorerServiceBaseUrl}/${HttpFileService.BASE_FILE_COUNT_URL}${this.pathSuffix}`,
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
        const postBody: SelectionAggregationRequest = {
            selections: simplifyCsvSelection(selections),
        };
        const requestUrl = `${this.fileExplorerServiceBaseUrl}/${HttpFileService.SELECTION_AGGREGATE_URL}${this.pathSuffix}`;

        const response = await this.post<SelectionAggregationResult>(
            requestUrl,
            JSON.stringify(postBody)
        );

        // data is always an array, this endpoint should always return an array of length 1
        if (response.data.length !== 1) {
            throw new Error(
                `Expected response.data of ${JSON.stringify(postBody)} to contain a single count`
            );
        }
        return response.data[0];
    }

    /**
     * Get list of file documents that match a given filter, potentially according to a particular sort order,
     * and potentially starting from a particular file_id and limited to a set number of files.
     */
    public async getFiles(request: GetFilesRequest): Promise<FileDetail[]> {
        const { from, limit, fileSet } = request;

        const base = `${this.fileExplorerServiceBaseUrl}/${HttpFileService.BASE_FILES_URL}${this.pathSuffix}?from=${from}&limit=${limit}`;
        const requestUrl = join(compact([base, fileSet.toQueryString()]), "&");

        const response = await this.get<FmsFile>(requestUrl);
        const env = this.getEnvironmentFromUrl();
        return response.data.map((file) => new FileDetail(file, env));
    }

    /**
     * Get a single file that has a unique ID matching uid.
     * For FMS files, we use the File ID annotation as the unique id
     * instead of HIDDEN_UID_ANNOTATION
     */
    public async getFileByUid(uid: string): Promise<FileDetail | undefined> {
        let files;
        try {
            files = await this.getFiles({
                from: 0,
                limit: 1,
                fileSet: new FileSet({
                    fileService: this,
                    filters: [new FileFilter(AnnotationName.FILE_ID, uid)],
                }),
            });
        } catch (err) {
            console.error(`Failed to find file ${uid}. Error: ${(err as Error).message}`);
            return undefined;
        }
        if (files.length !== 1) {
            throw new Error(
                `Failed to fetch 1 file for File ID ${uid}. Found ${files.length} instead.`
            );
        }
        return files[0];
    }

    private async getSelectionsCsv(
        annotations: string[],
        selections: Selection[]
    ): Promise<{ url: string; data: Blob }> {
        const postData = JSON.stringify({
            annotations,
            selections: simplifyCsvSelection(selections),
        });
        const url = `${this.fileExplorerServiceBaseUrl}/${HttpFileService.BASE_CSV_DOWNLOAD_URL}${this.pathSuffix}`;
        const data = await this.downloadService.prepareHttpResourceForDownload(url, postData);
        return { url, data };
    }

    public async getManifest(
        annotations: string[],
        selections: Selection[],
        format: "csv" | "json" | "parquet"
    ): Promise<File> {
        if (format !== "csv") {
            throw new Error(
                "Only CSV manifest is supported at this time for downloading from AICS FMS"
            );
        }
        const { data } = await this.getSelectionsCsv(annotations, selections);
        const name = `file-manifest-${new Date()}.csv`;
        const formatToMimeType = {
            csv: "text/csv",
            // json: "application/json",
            // parquet: "application/octet-stream",
        };
        return new File([data], name, { type: formatToMimeType[format] });
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
        const { url, data } = await this.getSelectionsCsv(annotations, selections);
        const name = `file-manifest-${new Date()}.csv`;
        return this.downloadService.download(
            {
                name,
                id: name,
                path: url,
                data,
            },
            uniqueId()
        );
    }

    public async editFile(
        fileId: string,
        annotationNameToValuesMap: AnnotationNameToValuesMap,
        annotationNameToAnnotationMap?: Map<string, Annotation>,
        user?: string
    ): Promise<void> {
        if (!user) {
            throw new Error("User must be provided to edit file in AICS FMS");
        }
        const defaultUser = this.userName;
        this.setUserName(user);

        try {
            const requestUrl = `${this.metadataManagementServiceBaseURl}/${HttpFileService.BASE_FILE_EDIT_URL}/${fileId}`;
            const annotations = Object.entries(annotationNameToValuesMap).map(([name, values]) => {
                const annotationId = annotationNameToAnnotationMap?.get(name)?.id;
                if (!annotationId) {
                    throw new Error(
                        `Unable to edit file. Failed to find annotation id for annotation ${name}`
                    );
                }
                return { annotationId, values };
            });
            const requestBody = JSON.stringify({ customMetadata: { annotations } });
            await this.put(requestUrl, requestBody);
        } finally {
            // Revert back to whatever user before the request
            this.setUserName(defaultUser);
        }
    }

    /**
     * Cache a list of files to NAS cache (VAST) by sending their IDs to FSS.
     */
    public async cacheFiles(
        fileIds: string[],
        username?: string
    ): Promise<{ cacheFileStatuses: { [fileId: string]: string } }> {
        const requestUrl = `${this.loadBalancerBaseUrl}/${HttpFileService.BASE_FILE_CACHE_URL}${this.pathSuffix}`;
        const requestBody = JSON.stringify({ fileIds });
        const headers = {
            "Content-Type": "application/json",
            "X-User-Id": username || "anonymous",
        };

        try {
            const cacheStatuses = await this.rawPut<{
                cacheFileStatuses: { [fileId: string]: string };
            }>(requestUrl, requestBody, headers);
            return cacheStatuses;
        } catch (error) {
            console.error("Failed to cache files:", error);
            throw new Error("Unable to complete the caching request.");
        }
    }
}
