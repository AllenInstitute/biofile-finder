import { map } from "lodash";

import IMMUTABLE_ANNOTATION_NAMES from "./immutableAnnotationNames";
import AnnotationService, { AnnotationDetails, AnnotationValue } from "..";
import HttpServiceBase from "../../HttpServiceBase";
import Annotation, { AnnotationResponse, AnnotationResponseMms } from "../../../entity/Annotation";
import { AnnotationType, AnnotationTypeIdMap } from "../../../entity/AnnotationFormatter";
import FileFilter from "../../../entity/FileFilter";
import { TOP_LEVEL_FILE_ANNOTATIONS, TOP_LEVEL_FILE_ANNOTATION_NAMES } from "../../../constants";

enum QueryParam {
    EXCLUDE = "exclude",
    FILTER = "filter",
    FUZZY = "fuzzy",
    HIERARCHY = "hierarchy",
    INCLUDE = "include",
    ORDER = "order",
    PATH = "path",
}

/**
 * Service responsible for fetching annotation related metadata.
 */
export default class HttpAnnotationService extends HttpServiceBase implements AnnotationService {
    private static readonly ENDPOINT_VERSION = "1.0";
    public static readonly BASE_ANNOTATION_URL = `file-explorer-service/${HttpAnnotationService.ENDPOINT_VERSION}/annotations`;
    public static readonly BASE_ANNOTATION_HIERARCHY_ROOT_URL = `${HttpAnnotationService.BASE_ANNOTATION_URL}/hierarchy/root`;
    public static readonly BASE_ANNOTATION_HIERARCHY_UNDER_PATH_URL = `${HttpAnnotationService.BASE_ANNOTATION_URL}/hierarchy/under-path`;
    public static readonly BASE_AVAILABLE_ANNOTATIONS_UNDER_HIERARCHY = `${HttpAnnotationService.BASE_ANNOTATION_URL}/hierarchy/available`;
    public static readonly BASE_MMS_ANNOTATION_URL = `metadata-management-service/1.0/annotation`;
    public static readonly BASE_ANNOTATION_VALIDATION_URL = `${HttpAnnotationService.BASE_MMS_ANNOTATION_URL}/validate`;

    /**
     * Fetch all annotations.
     */
    public async fetchAnnotations(): Promise<Annotation[]> {
        const requestUrl = `${this.fileExplorerServiceBaseUrl}/${HttpAnnotationService.BASE_ANNOTATION_URL}${this.pathSuffix}`;

        const response = await this.get<AnnotationResponse>(requestUrl);
        return [
            ...TOP_LEVEL_FILE_ANNOTATIONS,
            ...map(
                response.data,
                (annotationResponse) =>
                    new Annotation({
                        ...annotationResponse,
                        isImmutable: IMMUTABLE_ANNOTATION_NAMES.has(
                            annotationResponse.annotationName
                        ),
                    })
            ),
        ];
    }

    /**
     * Fetch details about an annotation like its type and dropdown options
     */
    public async fetchAnnotationDetails(name: string): Promise<AnnotationDetails> {
        const requestUrl = `${this.metadataManagementServiceBaseURl}/${
            HttpAnnotationService.BASE_MMS_ANNOTATION_URL
        }/${HttpServiceBase.encodeURISection(name)}`;

        const response = await this.get<{ annotationTypeName: AnnotationType }>(requestUrl);
        const details = response.data[0];
        if (
            details.annotationTypeName !== AnnotationType.LOOKUP &&
            details.annotationTypeName !== AnnotationType.DROPDOWN
        ) {
            return { type: details.annotationTypeName };
        }

        // DROPDOWN & LOOKUP annotations are special in that their options consist of values
        // pulled from various database tables. We can't compile a complete list of these
        // due to BFF not being connected directly to the LabKey DB. Instead, what we can
        // do is grab the values in use for this annotation already as available options.
        const dropdownOptions = await this.fetchValues(name);
        return {
            dropdownOptions: dropdownOptions.map((opt) => opt.toString()),
            type: details.annotationTypeName,
        };
    }

    /**
     * Fetch the unique values for a specific annotation.
     */
    public async fetchValues(annotation: string): Promise<AnnotationValue[]> {
        // Encode any special characters in the annotation as necessary
        const encodedAnnotation = HttpServiceBase.encodeURISection(annotation);
        const requestUrl = `${this.fileExplorerServiceBaseUrl}/${HttpAnnotationService.BASE_ANNOTATION_URL}/${encodedAnnotation}/values${this.pathSuffix}`;

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

        const requestUrl = `${this.fileExplorerServiceBaseUrl}/${HttpAnnotationService.BASE_ANNOTATION_HIERARCHY_ROOT_URL}${this.pathSuffix}?${queryParams}`;

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
        const requestUrl = `${this.fileExplorerServiceBaseUrl}/${HttpAnnotationService.BASE_ANNOTATION_HIERARCHY_UNDER_PATH_URL}${this.pathSuffix}?${queryParams}`;

        const response = await this.get<string>(requestUrl);
        return response.data;
    }

    /**
     * Fetchs annotations that can be combined with current hierarchy while still producing a non-empty
     * file set
     */
    public async fetchAvailableAnnotationsForHierarchy(annotations: string[]): Promise<string[]> {
        const queryParams = this.buildQueryParams(QueryParam.HIERARCHY, [...annotations].sort());
        const requestUrl = `${this.fileExplorerServiceBaseUrl}/${HttpAnnotationService.BASE_AVAILABLE_ANNOTATIONS_UNDER_HIERARCHY}${this.pathSuffix}?${queryParams}`;

        const response = await this.get<string>(requestUrl);
        if (!response.data) {
            return annotations;
        }

        return [...TOP_LEVEL_FILE_ANNOTATION_NAMES, ...response.data, ...annotations];
    }

    /**
     * Validate annotation values according the type the annotation they belong to.
     */
    public async validateAnnotationValues(
        name: string,
        values: AnnotationValue[]
    ): Promise<boolean> {
        const responses = await Promise.all(
            values.map((value) =>
                this.get<boolean>(
                    `${this.metadataManagementServiceBaseURl}/${
                        HttpAnnotationService.BASE_ANNOTATION_VALIDATION_URL
                    }/${HttpServiceBase.encodeURISection(name)}?value=${value}`
                )
            )
        );

        return responses.every((response) => !!response.data[0]);
    }

    private buildQueryParams(param: QueryParam, values: string[]): string {
        return values.map((value) => `${param}=${value}`).join("&");
    }

    /**
     * Creates a new annotation via the metadata-management-service
     * @param annotation The new annotation to create
     * @param annotationOptions If not empty, pre-set options for annotations of type Dropdown
     * @param user If not empty, the user of the request
     */
    public async createAnnotation(
        annotation: Annotation,
        annotationOptions: string[] = [],
        user?: string
    ): Promise<AnnotationResponseMms[]> {
        if (!user) {
            throw new Error("User must be provided to create a metadata field in AICS FMS");
        }
        const defaultUser = this.userName;
        this.setUserName(user);

        try {
            const requestUrl = `${this.metadataManagementServiceBaseURl}/${HttpAnnotationService.BASE_MMS_ANNOTATION_URL}/`;
            const annotationType = annotation.type as AnnotationType;
            const requestBody = {
                annotationTypeId: AnnotationTypeIdMap[annotationType],
                annotationOptions,
                description: annotation.description,
                name: annotation.name,
            };
            const response = await this.post<AnnotationResponseMms>(
                requestUrl,
                JSON.stringify(requestBody)
            );

            return response.data;
        } finally {
            // Revert back to whatever user before the request
            this.setUserName(defaultUser);
        }
    }
}
