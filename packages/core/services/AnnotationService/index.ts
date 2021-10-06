import { map } from "lodash";

import HttpServiceBase, { ConnectionConfig } from "../HttpServiceBase";
import Annotation from "../../entity/Annotation";
import FileFilter from "../../entity/FileFilter";

/**
 * Expected JSON structure of an annotation returned from the query service.
 */
export interface AnnotationResponse {
    annotationDisplayName: string;
    annotationName: string;
    description: string;
    type: string;
    units?: string;
}
// TODO: Add some more tests

export type AnnotationValue = string | number | boolean | Date;

enum QueryParam {
    FILTER = "filter",
    HIERARCHY = "hierarchy",
    ORDER = "order",
    PATH = "path",
}

/**
 * Service responsible for fetching annotation related metadata.
 */
export default class AnnotationService extends HttpServiceBase {
    private static readonly ENDPOINT_VERSION = "1.0";
    public static readonly BASE_ANNOTATION_URL = `file-explorer-service/${AnnotationService.ENDPOINT_VERSION}/annotations`;
    public static readonly BASE_ANNOTATION_HIERARCHY_ROOT_URL = `${AnnotationService.BASE_ANNOTATION_URL}/hierarchy/root`;
    public static readonly BASE_ANNOTATION_HIERARCHY_UNDER_PATH_URL = `${AnnotationService.BASE_ANNOTATION_URL}/hierarchy/under-path`;
    public static readonly BASE_AVAILABLE_ANNOTATIONS_UNDER_HIERARCHY = `${AnnotationService.BASE_ANNOTATION_URL}/hierarchy/available`;

    public constructor(config: ConnectionConfig = {}) {
        super(config);
    }

    /**
     * Fetch all annotations.
     */
    public async fetchAnnotations(): Promise<Annotation[]> {
        const requestUrl = `${this.baseUrl}/${AnnotationService.BASE_ANNOTATION_URL}${this.pathSuffix}`;
        console.log(`Requesting annotation values from ${requestUrl}`);

        const response = await this.get<AnnotationResponse>(requestUrl);
        return map(response.data, (annotationResponse) => new Annotation(annotationResponse));
    }

    /**
     * Fetch the unique values for a specific annotation.
     */
    public async fetchValues(annotation: string): Promise<AnnotationValue[]> {
        // Encode any special characters in the annotation as necessary
        const encodedAnnotation = HttpServiceBase.encodeURISection(annotation);
        const requestUrl = `${this.baseUrl}/${AnnotationService.BASE_ANNOTATION_URL}/${encodedAnnotation}/values${this.pathSuffix}`;
        console.log(`Requesting annotation values from ${requestUrl}`);

        const response = await this.get<AnnotationValue>(requestUrl);
        return response.data;
    }

    public async fetchRootHierarchyValues(
        hierarchy: string[],
        filters: FileFilter[]
    ): Promise<string[]> {
        // It's important that we fetch values for the correct (i.e., first) level of the hierarchy.
        // But after that, sort the levels so that we can effectively cache the result
        // resorting the hierarchy underneath the first level should have no effect on the result.
        // This is a huge optimization.
        const [first, ...rest] = hierarchy;
        const queryParams = [
            this.buildQueryParams(QueryParam.ORDER, [first, ...rest.sort()]),
            this.buildQueryParams(
                QueryParam.FILTER,
                filters.map((f) => f.toQueryString())
            ),
        ]
            .filter((param) => !!param)
            .join("&");

        const requestUrl = `${this.baseUrl}/${AnnotationService.BASE_ANNOTATION_HIERARCHY_ROOT_URL}${this.pathSuffix}?${queryParams}`;
        console.log(`Requesting root hierarchy values: ${requestUrl}`);

        const response = await this.get<string>(requestUrl);
        return response.data;
    }

    public async fetchHierarchyValuesUnderPath(
        hierarchy: string[],
        path: string[],
        filters: FileFilter[]
    ): Promise<string[]> {
        const queryParams = [
            this.buildQueryParams(QueryParam.ORDER, hierarchy),
            this.buildQueryParams(QueryParam.PATH, path),
            this.buildQueryParams(
                QueryParam.FILTER,
                filters.map((f) => f.toQueryString())
            ),
        ]
            .filter((param) => !!param)
            .join("&");
        const requestUrl = `${this.baseUrl}/${AnnotationService.BASE_ANNOTATION_HIERARCHY_UNDER_PATH_URL}${this.pathSuffix}?${queryParams}`;
        console.log(`Requesting hierarchy values under path: ${requestUrl}`);

        const response = await this.get<string>(requestUrl);
        return response.data;
    }

    /**
     * Fetchs annotations that can be combined with current hierarchy while still producing a non-empty
     * file set
     */
    public async fetchAvailableAnnotationsForHierarchy(annotations: string[]): Promise<string[]> {
        const queryParams = this.buildQueryParams(QueryParam.HIERARCHY, [...annotations].sort());
        const requestUrl = `${this.baseUrl}/${AnnotationService.BASE_AVAILABLE_ANNOTATIONS_UNDER_HIERARCHY}${this.pathSuffix}?${queryParams}`;
        console.log(`Requesting available annotations with current hierarchy: ${requestUrl}`);

        const response = await this.get<string>(requestUrl);
        return response.data;
    }

    private buildQueryParams(param: QueryParam, values: string[]): string {
        return values.map((value) => `${param}=${value}`).join("&");
    }
}
