import { map } from "lodash";

import Annotation from "../../entity/Annotation";
import { FLAT_FILE_DATA_SOURCE } from "../../constants";
import HttpServiceBase from "../HttpServiceBase";
import RestServiceResponse from "../../entity/RestServiceResponse";

/**
 * Expected JSON structure of an annotation returned from the query service.
 */
export interface AnnotationResponse {
    annotationDisplayName: string;
    annotationName: string;
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
    private static BASE_ANNOTATION_HIERARCHY_ROOT_URL = `${AnnotationService.BASE_ANNOTATION_URL}/hierarchy/root`;
    private static BASE_ANNOTATION_HIERARCHY_UNDER_PATH_URL = `${AnnotationService.BASE_ANNOTATION_URL}/hierarchy/under-path`;

    /**
     * Fetch all annotations.
     */
    public async fetchAnnotations(): Promise<Annotation[]> {
        if (this.baseUrl !== FLAT_FILE_DATA_SOURCE) {
            const requestUrl = `${this.baseUrl}/${AnnotationService.BASE_ANNOTATION_URL}`;
            console.log(`Requesting annotation values from ${requestUrl}`);

            const response = await this.get<AnnotationResponse>(requestUrl);
            return map(response.data, (annotationResponse) => new Annotation(annotationResponse));
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

    public async fetchRootHierarchyValues(hierarchy: string[]): Promise<string[]> {
        // It's important that we fetch values for the correct (i.e., first) level of the hierarchy.
        // But after that, sort the levels so that we can effectively cache the result
        // resorting the hierarchy underneath the first level should have no effect on the result.
        // This is a huge optimization.
        const [first, ...rest] = hierarchy;
        const queryParams = [first, ...rest.sort()]
            .map((annotationName) => `order=${annotationName}`)
            .join("&");
        const requestUrl = `${this.baseUrl}/${AnnotationService.BASE_ANNOTATION_HIERARCHY_ROOT_URL}?${queryParams}`;
        console.log(`Requesting root hierarchy values: ${requestUrl}`);

        const response = await this.get<string>(requestUrl);
        return response.data;
    }

    public async fetchHierarchyValuesUnderPath(
        hierarchy: string[],
        path: string[]
    ): Promise<string[]> {
        const queryParams = [
            ...hierarchy.map((annotationName) => `order=${annotationName}`),
            ...path.map((annotationValue) => `path=${annotationValue}`),
        ].join("&");
        const requestUrl = `${this.baseUrl}/${AnnotationService.BASE_ANNOTATION_HIERARCHY_UNDER_PATH_URL}?${queryParams}`;
        console.log(`Requesting hierarchy values under path: ${requestUrl}`);

        const response = await this.get<string>(requestUrl);
        return response.data;
    }
}
