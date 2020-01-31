import Annotation from "../../entity/Annotation";
import { FLAT_FILE_DATA_SOURCE } from "../../constants";
import HttpServiceBase from "../HttpServiceBase";
import RestServiceResponse from "../../entity/RestServiceResponse";

/**
 * Expected JSON structure of an annotation returned from the query service.
 */
export interface AnnotationResponse {
    annotation_display_name: string;
    annotation_name: string;
    description: string;
    type: string;
    units?: string;
    values: (string | number | boolean | Date)[];
}

/**
 * Service responsible for fetching annotation related metadata.
 */
export default class AnnotationService extends HttpServiceBase {
    private static ANNOTATION_ENDPOINT_VERSION = "1.0";
    private static BASE_ANNOTATION_URL = `file-explorer-service/${AnnotationService.ANNOTATION_ENDPOINT_VERSION}/annotations`;

    /**
     * Fetch all annotations.
     */
    public async fetchAnnotations(): Promise<Annotation[]> {
        if (this.host !== FLAT_FILE_DATA_SOURCE) {
            const requestUrl = `${this.protocol}://${this.host}:${this.port}/${AnnotationService.BASE_ANNOTATION_URL}`;
            console.log(`Requesting annotation values from ${requestUrl}`);

            const response = await this.httpClient.get(requestUrl);
            return response.data;
        }

        // TEMPORARY, FLAT-FILE BASED IMPLEMENTATION UNTIL QUERY SERVICE IS STABLE
        console.log("Requesting annotation values from flat file: assets/annotations.json");
        return new Promise<Annotation[]>((resolve) => {
            const response = new RestServiceResponse<AnnotationResponse>(
                require("../../../assets/annotations.json")
            );
            const annotations = response.data.map(
                (annotationResponse) => new Annotation(annotationResponse)
            );
            resolve(annotations);
        });
    }
}
