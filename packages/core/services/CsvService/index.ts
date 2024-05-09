import {
    DownloadResult,
} from "../FileDownloadService";
import { Selection } from "../FileService/HttpFileService";

export interface CsvManifestRequest {
    annotations: string[];
    selections: Selection[];
}

/**
 * Service responsible for requesting a CSV manifest of metadata for selected files
 */
export default interface CsvService {
    getCsvAsBytes(
        selectionRequest: CsvManifestRequest,
        manifestDownloadId: string
    ): Promise<Uint8Array>
}
