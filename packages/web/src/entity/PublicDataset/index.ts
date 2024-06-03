import { FmsFileAnnotation } from "../../../../core/services/FileService";

/**
 * Represents an open-source dataset that will be publicly available on the BioFile Finder web version.
 *
 * Currently all types are strings and highly permissive to side-step conversion errors
 */
export interface PublicDatasetProps {
    dataset_id?: string;
    dataset_name: string;
    dataset_path?: string;
    dataset_size?: string;
    description?: string;
    doi?: string;
    file_count?: string;
    created?: string;
    published?: string;
    related_publication?: string;
    version?: string;
}

// Originally noted in core/entity/Annotation: TypeScript (3.9) raises an error if this is an enum
// Reference issue without clear resolution: https://github.com/microsoft/TypeScript/issues/6307
/**
 * Matches fields in the dataset manifest to props in this interface
 */
export const DatasetAnnotations = {
    CREATION_DATE: {
        displayLabel: "Creation date",
        name: "created",
    },
    DATASET_ID: {
        displayLabel: "Dataset ID",
        name: "dataset_id",
    },
    DATASET_NAME: {
        displayLabel: "Dataset name",
        name: "dataset_name",
    },
    DATASET_PATH: {
        displayLabel: "File Path",
        name: "dataset_path",
    },
    DATASET_SIZE: {
        displayLabel: "Size",
        name: "dataset_size",
    },
    DATASET_DESCRIPTION: {
        displayLabel: "Short description",
        name: "description",
    },
    DOI: {
        displayLabel: "DOI",
        name: "doi",
    },
    FILE_COUNT: {
        displayLabel: "File count",
        name: "file_count",
    },
    PUBLICATION_DATE: {
        displayLabel: "Publication date",
        name: "published",
    },
    RELATED_PUBLICATON: {
        displayLabel: "Related publication",
        name: "related_publication",
    },
    VERSION: {
        displayLabel: "Version",
        name: "version",
    },
};

export const DATASET_DISPLAY_FIELDS = [
    DatasetAnnotations.CREATION_DATE,
    DatasetAnnotations.RELATED_PUBLICATON,
    DatasetAnnotations.DATASET_SIZE,
    DatasetAnnotations.PUBLICATION_DATE,
    DatasetAnnotations.FILE_COUNT,
    DatasetAnnotations.DOI,
];

/**
 * Handles conversion from an FmsFile to a dataset format that can be accepted by IDetailsRow
 */
export default class PublicDataset {
    private datasetDetails: PublicDatasetProps;
    private annotations: FmsFileAnnotation[];

    constructor(datasetDetails: PublicDatasetProps, annotations: FmsFileAnnotation[] = []) {
        this.annotations = annotations;
        if (!annotations?.length) {
            this.datasetDetails = datasetDetails;
        } else {
            const mappedAnnotationsToProps: PublicDatasetProps = {
                dataset_name: datasetDetails.dataset_name,
            };
            Object.values(DatasetAnnotations).forEach((value) => {
                const equivalentAnnotation = annotations.find((e) => e.name === value.displayLabel);
                if (equivalentAnnotation && equivalentAnnotation.values[0] !== "null") {
                    // csv may set empty fields to string of value 'null'
                    this.setMetadata(
                        mappedAnnotationsToProps,
                        value.name as keyof PublicDatasetProps,
                        equivalentAnnotation.values[0] as string // Temporary measure to avoid type errors
                    );
                }
            });
            this.datasetDetails = mappedAnnotationsToProps;
        }
    }

    public get details(): PublicDatasetProps {
        return this.datasetDetails;
    }

    public get id(): string {
        const id =
            this.datasetDetails.dataset_id ||
            this.getFirstAnnotationValue(DatasetAnnotations.DATASET_ID.displayLabel);
        if (id === undefined) {
            throw new Error("Dataset ID is not defined");
        }
        return id as string;
    }

    public get name(): string {
        return this.datasetDetails.dataset_name;
    }

    public get path(): string {
        const path =
            this.datasetDetails.dataset_path ||
            this.getFirstAnnotationValue(DatasetAnnotations.DATASET_PATH.displayLabel);
        if (path === undefined) {
            throw new Error("Dataset Path is not defined");
        }
        return path as string;
    }

    public get description(): string {
        const description =
            this.datasetDetails.description ||
            this.getFirstAnnotationValue(DatasetAnnotations.DATASET_DESCRIPTION.displayLabel);
        if (description === undefined) {
            return "";
        }
        return description as string;
    }

    public getFirstAnnotationValue(annotationName: string): string | number | boolean | undefined {
        return this.getAnnotation(annotationName)?.values[0];
    }

    public getAnnotation(annotationName: string): FmsFileAnnotation | undefined {
        return this.annotations.find((annotation) => annotation.name === annotationName);
    }

    private setMetadata<K extends keyof PublicDatasetProps, V extends PublicDatasetProps[K]>(
        obj: PublicDatasetProps,
        prop: K,
        value: V
    ) {
        obj[prop] = value;
    }
}
