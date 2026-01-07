import SearchParams, { SearchParamsComponents } from "../../../../core/entity/SearchParams";
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
    featured?: "TRUE" | "FALSE"; // string containing boolean indicating if this is one of BFF's featured datasets
    file_count?: string;
    index?: string;
    created?: string;
    organization?: string;
    published?: string;
    related_publication?: string;
    related_publication_link?: string;
    specific_query?: string; // A pre-set query that we will attempt to load by default
    version?: string;
    source?: string; // Indicate whether the dataset comes from internal (AICS) or external (other) source
}

export class DatasetAnnotation {
    public displayLabel: string;
    public name: string;
    public minWidth: number;

    constructor(displayLabel: string, name: string, minWidth = 0) {
        this.displayLabel = displayLabel;
        this.name = name;
        this.minWidth = minWidth;
    }

    public equals(target: DatasetAnnotation): boolean {
        return this.displayLabel === target.displayLabel && this.name === target.name;
    }
}

// Originally noted in core/entity/Annotation: TypeScript (3.9) raises an error if this is an enum
// Reference issue without clear resolution: https://github.com/microsoft/TypeScript/issues/6307
/**
 * Matches fields in the dataset manifest to props in this interface
 */
export const DatasetAnnotations = {
    CREATION_DATE: new DatasetAnnotation("Creation date", "created", 112),
    DATASET_ID: new DatasetAnnotation("Dataset ID", "dataset_id"),
    DATASET_NAME: new DatasetAnnotation("Dataset name", "dataset_name", 50),
    DATASET_PATH: new DatasetAnnotation("File Path", "dataset_path"),
    DATASET_SIZE: new DatasetAnnotation("Size", "dataset_size", 78),
    DATASET_DESCRIPTION: new DatasetAnnotation("Short description", "description", 200),
    DOI: new DatasetAnnotation("DOI", "doi"),
    FEATURED: new DatasetAnnotation("Featured", "featured"),
    FILE_COUNT: new DatasetAnnotation("File count", "file_count", 89),
    INDEX: new DatasetAnnotation("Index", "index", 1),
    ORGANIZATION: new DatasetAnnotation("Organization", "organization", 114),
    PUBLICATION_DATE: new DatasetAnnotation("Publication date", "published", 128),
    RELATED_PUBLICATON: new DatasetAnnotation("Related publication", "related_publication", 178),
    RELATED_PUBLICATION_LINK: new DatasetAnnotation(
        "Related publication link",
        "related_publication_link"
    ),
    SOURCE: new DatasetAnnotation("Source", "source"),
    SPECIFIC_QUERY: new DatasetAnnotation("Specific query", "specific_query"),
    VERSION: new DatasetAnnotation("Version", "version"),
};

// Limited set used for the details panel
export const DATASET_DISPLAY_FIELDS = [
    DatasetAnnotations.ORGANIZATION,
    DatasetAnnotations.RELATED_PUBLICATON,
    DatasetAnnotations.DOI,
    DatasetAnnotations.PUBLICATION_DATE,
    DatasetAnnotations.CREATION_DATE,
    DatasetAnnotations.FILE_COUNT,
    DatasetAnnotations.DATASET_SIZE,
];

// Limited set used for the table header
export const DATASET_TABLE_FIELDS = [
    DatasetAnnotations.DATASET_NAME,
    DatasetAnnotations.DATASET_DESCRIPTION,
    DatasetAnnotations.CREATION_DATE,
    DatasetAnnotations.RELATED_PUBLICATON,
    DatasetAnnotations.ORGANIZATION,
    DatasetAnnotations.FILE_COUNT,
    DatasetAnnotations.DATASET_SIZE,
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
                // csv may set empty fields to string of value 'null'
                if (equivalentAnnotation && equivalentAnnotation.values[0] !== "null") {
                    this.setMetadata(
                        mappedAnnotationsToProps,
                        value.name as keyof PublicDatasetProps,
                        // We currently split on commas, which breaks the description field into multiple values
                        // This is hopefully just a temporary solution, since doesn't work for numbers (e.g., 30,000 becomes 30, 000)
                        equivalentAnnotation.values.join(", ") as string // String casting as temporary measure to avoid type errors
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

    public get presetQuery(): SearchParamsComponents | undefined {
        if (!this.datasetDetails.specific_query) {
            return;
        } else {
            return SearchParams.decode(this.datasetDetails.specific_query);
        }
    }

    public get featured(): boolean {
        return this.datasetDetails.featured === "TRUE";
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
