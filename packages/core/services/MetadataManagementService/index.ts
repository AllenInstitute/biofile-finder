import { MetadataManagementServiceBaseUrl } from "../../../desktop/src/util/constants";
import HttpServiceBase, { ConnectionConfig } from "../HttpServiceBase";

interface Config extends ConnectionConfig {
    baseUrl: string | keyof typeof MetadataManagementServiceBaseUrl;
}

// Interfaces borrowed from aics-file-upload-app
// Used for the POST request to MMS for creating file metadata
export interface MMSFileAnnotation {
    annotationId: number;
    values: string[];
}

export interface MMSFile {
    fileId: string;
    annotations?: MMSFileAnnotation[];
    templateId?: number;
}

export interface MMSUploadRequest {
    customMetadata?: MMSFile;
    fileType?: string;
    file: FileMetadataBlock;
    [id: string]: any;
}

interface FileMetadataBlock {
    originalPath: string;
    fileName?: string;
    fileType: string;
    jobId?: string;
    [id: string]: any;
}

export default class MetadataManagementService extends HttpServiceBase {
    private static readonly FILEMETADATA_ENDPOINT_VERSION = "1.0";

    constructor(config: Config) {
        super(config);
    }

    public async getFileMetadata(fileId: string): Promise<MMSFile> {
        const url = `${this.baseUrl}/${MetadataManagementService.FILEMETADATA_ENDPOINT_VERSION}/filemetadata/${fileId}`;
        const response = await this.get<MMSFile>(url);
        return response.data[0];
    }

    public async editFileMetadata(fileId: string, request: MMSUploadRequest): Promise<void> {
        const url = `${this.baseUrl}/${MetadataManagementService.FILEMETADATA_ENDPOINT_VERSION}/filemetadata/${fileId}`;
        const requestBody = JSON.stringify(request);
        await this.put(url, requestBody);
    }
}
