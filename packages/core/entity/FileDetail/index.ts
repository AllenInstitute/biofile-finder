import { isEmpty, isNil, isObject, uniq } from "lodash";

import { renderZarrThumbnailURL } from "./RenderZarrThumbnailURL";
import AnnotationName from "../Annotation/AnnotationName";
import { Environment } from "../../constants";
import {
    FmsFileAnnotation,
    MetadataValue,
    NestedMetadataValue,
    PrimitiveMetadataValue,
} from "../../services/FileService";

const RENDERABLE_IMAGE_FORMATS = [".jpg", ".jpeg", ".png", ".gif"];
const AICS_FMS_S3_URL_PREFIX = "https://s3.us-west-2.amazonaws.com/";

const AICS_FMS_S3_BUCKETS: Record<Environment, string> = {
    PRODUCTION: "production.files.allencell.org",
    STAGING: "staging.files.allencell.org",
    LOCALHOST: "",
    TEST: "test.files.allencell.org",
};

const NAS_HOST_PREFIXES: Record<Environment, string> = {
    LOCALHOST: "/tmp/fss/local",
    PRODUCTION: "/allen/programs/allencell/data/proj0",
    STAGING: "/allen/aics/software/apps/staging/fss/data",
    TEST: "/test",
};

/**
 * Expected JSON response of a file detail returned from the query service. Example:
 * {
 *      // user defined
 *      annotations: [
 *          {
 *              annotation_id: 1,
 *              values: ["AICS_10", "AICS_12"],
 *              position: null,
 *              channel: null,
 *              time: null,
 *           },
 *          {
 *              annotation_id: 2,
 *              values: [true],
 *              position: null,
 *              channel: 1,
 *              time: null,
 *           },
 *          {
 *              annotation_id: 3,
 *              values: [true],
 *              position: 2,
 *              channel: null,
 *              time: null,
 *           },
 *      ],
 *      // acquisition metadata
 *      channels: [
 *          { id: 1, name: "GFP channel", laser_power: 10, exposure_time: 100 },
 *          { id: 2, name: "Brightfield", laser_power: 1, exposure_time: 10 },
 *      ],
 *      // acquisition metadata
 *      positions: [
 *          { id: 1, name: "Tiled region one", x: 3002382.939, y: 29384309328.2 },
 *          { id: 2, name: "Position 2", x: 93849.288, y: 710383.19 },
 *      ],
 *      // acquisition metadata
 *      time: [
 *          { id: 34, deltaT: "foobar" },
 *      ]
 *     file_id: "26aa7881b8004dd0bcec857baf9a2f0a",
 *     thumbnail: "src/of/thumbnail",
 *     uploaded: "2019-08-15 13:50:24",
 * }
 */

/**
 * Represents a document in the FMS MongoDb `files` collection (as returned by FES). It is extremely permissively typed to allow
 * for rapid iteration in the initial stages of this project.
 *
 * See https://aicsbitbucket.corp.alleninstitute.org/projects/SW/repos/mongo-schema-management/browse/mongo_schema_management/schema/file_explorer_v1/file.json for
 * the most up-to-date interface for this data structure.
 */
export interface FmsFile {
    annotations: FmsFileAnnotation[];
    file_id?: string;
    file_name?: string;
    file_path?: string;
    file_size?: number;
    uploaded?: string;
    thumbnail?: string;
}
// Keys of fields that are expected to be present in the FMS file detail response. Any other keys will be ignored.
const KEYS_IN_FMS_FILE = new Set([
    "annotations",
    "file_id",
    "file_name",
    "file_path",
    "file_size",
    "uploaded",
    "thumbnail",
]);

/**
 * Facade for a FileDetailResponse.
 */
export default class FileDetail {
    public readonly metadata: Map<string, MetadataValue>;
    private readonly env: Environment;
    private readonly uniqueId?: string;

    private static convertAicsS3PathToHttpUrl(path: string): string {
        return `${AICS_FMS_S3_URL_PREFIX}${path}`;
    }

    private static isLikelyLocalFile(path: string): boolean {
        return !path.startsWith("http") && !path.startsWith("s3");
    }

    /**
     * Recursively extract leaf values from nested metadata by traversing the given path segments.
     * At each level, if the current values are NestedMetadataValue[], look up the next segment
     * in each entry and collect the results. Handles arbitrary nesting depth.
     */
    private static extractNestedValues(
        values: MetadataValue,
        remainingPath: string[]
    ): MetadataValue | undefined {
        if (remainingPath.length === 0) return values;

        const [nextSegment, ...rest] = remainingPath;

        // Collect values for `nextSegment` from each nested entry
        const collected: MetadataValue[number][] = [];
        for (const entry of values) {
            // Only NestedMetadataValue objects have sub-fields to traverse
            if (isNil(entry) || !isObject(entry)) continue;

            const nestedEntry = entry as NestedMetadataValue;
            const nestedValue = nestedEntry[nextSegment];
            if (isNil(nestedValue)) continue;

            // Base case: if this is the last segment, collect the primitive values
            if (rest.length === 0) {
                collected.push(...nestedValue);
            } else {
                // More path segments remain — recurse deeper
                const deeper = FileDetail.extractNestedValues(nestedValue, rest);
                if (deeper) collected.push(...deeper);
            }
        }

        return collected.length > 0 ? (collected as MetadataValue) : undefined;
    }

    constructor(file: FmsFile, env: Environment, uniqueId?: string) {
        this.metadata = Object.entries(file)
            // Map key/value entries on the file info object
            // to annotations-like structure so that we can treat all metadata as
            // annotations in the frontend and avoid having some weird special cases
            .flatMap(([key, value]) => {
                if (isNil(value) || !KEYS_IN_FMS_FILE.has(key)) return [];
                if (key === "annotations") return value as FmsFileAnnotation[];

                // Skip any fields that have unexpected types to avoid runtime errors.
                if (
                    typeof value !== "string" &&
                    typeof value !== "number" &&
                    typeof value !== "boolean"
                ) {
                    console.error(
                        `Unexpected type for file metadata field ${key}: ${typeof value}. Expected string, number, or boolean. Skipping this field.`
                    );
                    return [];
                }
                return [{ name: key, values: [value] }] as FmsFileAnnotation[];
            })
            // Finally, convert to a map for easier lookup later on
            .reduce((accum, { name, values }) => {
                accum.set(name, values);
                return accum;
            }, new Map<string, MetadataValue>());
        this.env = env;
        this.uniqueId = uniqueId;
    }

    public get uid(): string {
        return this.uniqueId || this.id;
    }

    public get id(): string {
        const id =
            this.getFirstAnnotationValue(AnnotationName.FILE_ID) ||
            this.getFirstAnnotationValue("File ID");
        if (id === undefined) {
            throw new Error("File ID is not defined");
        }
        return id as string;
    }

    public get name(): string {
        // TODO: create ticket for removing name vs displayname
        // TODO: make sure things like this get captured as constants after that change
        // TODO: then make everything a list of annotations rather than this weird hybrid
        const name =
            this.getFirstAnnotationValue(AnnotationName.FILE_NAME) ||
            this.getFirstAnnotationValue("File Name");
        if (name === undefined) {
            throw new Error("File Name is not defined");
        }
        return name as string;
    }

    public get path(): string {
        const path =
            this.getFirstAnnotationValue(AnnotationName.FILE_PATH) ||
            this.getFirstAnnotationValue("File Path");
        if (path === undefined) {
            throw new Error("File Path is not defined");
        }

        // AICS FMS files have paths like this in fileDetail.file_path:
        // staging.files.allencell.org/130/b23/bfe/117/2a4/71b/746/002/064/db4/1a/danny_int_test_4.txt
        if (
            typeof path === "string" &&
            // Loosen restriction on matching the current environment
            [this.env, "STAGING", "PRODUCTION"].some((env) => {
                return path.startsWith(AICS_FMS_S3_BUCKETS[env as Environment]);
            }) &&
            AICS_FMS_S3_BUCKETS[this.env]
        ) {
            return FileDetail.convertAicsS3PathToHttpUrl(path) as string;
        }

        // Otherwise just return the path as is and hope for the best
        return path as string;
    }

    public get size(): number | undefined {
        const size =
            this.getFirstAnnotationValue(AnnotationName.FILE_SIZE) ||
            this.getFirstAnnotationValue("File Size");
        if (size !== undefined) {
            if (typeof size === "number") {
                return size;
            }
            if (typeof size === "string") {
                return parseInt(size, 10);
            }
        }
        return 0; // Default to 0 if size is not defined for now, need better system
    }

    public get thumbnail(): string | undefined {
        return (this.getFirstAnnotationValue(AnnotationName.THUMBNAIL_PATH) ||
            this.getFirstAnnotationValue("Thumbnail")) as string | undefined;
    }

    public get isLikelyLocalFile(): boolean {
        return FileDetail.isLikelyLocalFile(this.path);
    }

    // TODO: Refactor to use boolean naming convention
    public get downloadInProgress(): boolean {
        const shouldBeInLocal = this.getFirstAnnotationValue(AnnotationName.SHOULD_BE_IN_LOCAL);
        const cacheEvictionDate = this.getFirstAnnotationValue(AnnotationName.CACHE_EVICTION_DATE);
        return cacheEvictionDate === undefined && shouldBeInLocal === true;
    }

    /**
     * Retrieve the annotation value(s) for a given annotation name or path.
     * For nested annotations, the path can be specified as an array of strings
     * (e.g. ["Well", "Dose", "Unit"]) to traverse into nested metadata structures
     * and retrieve leaf values.
     */
    public getAnnotation(path: string | string[]): MetadataValue | undefined {
        // Simple case: primitive annotation lookup by name (e.g. "Gene")
        if (!Array.isArray(path)) return this.metadata.get(path);
        if (path.length === 0) return undefined;
        if (path.length === 1) return this.metadata.get(path[0]);

        // For nested paths like ["Well", "Dose", "Unit"], traverse the nested structure:
        // 1. Get the root value (e.g., the "Well" column — a NestedMetadataValue[])
        // 2. For each subsequent path segment, drill into matching sub-fields
        const rootValue = this.metadata.get(path[0]);
        if (!rootValue) return undefined;

        const values = FileDetail.extractNestedValues(rootValue, path.slice(1));
        if (isNil(values) || isEmpty(values)) return undefined;
        return isObject(values[0])
            ? (values as NestedMetadataValue[])
            : uniq(values as PrimitiveMetadataValue[]);
    }

    public getFirstAnnotationValue(
        annotationName: string
    ): PrimitiveMetadataValue | NestedMetadataValue | undefined {
        return this.getAnnotation(annotationName)?.[0];
    }

    public async getPathToThumbnail(targetSize?: number): Promise<string | undefined> {
        // When no thumbnail is provided, try to render one from the file path if it's a
        // zarr or a known renderable image format
        if (!this.thumbnail) {
            // If the actual file can be easily rendered in the browser automatically
            // (like a .png) then just go ahead and return it instead
            const isFileRenderableImage = RENDERABLE_IMAGE_FORMATS.some((format) =>
                this.path.toLowerCase().endsWith(format)
            );
            if (isFileRenderableImage) return this.path;

            // Try to render a thumbnail from the zarr if the path is a zarr
            // and isn't a local file (since we can't read local zarrs in the browser)
            if (this.path.includes(".zarr") && !FileDetail.isLikelyLocalFile(this.path)) {
                return renderZarrThumbnailURL(this.path, targetSize);
            }

            return undefined;
        }

        // If the thumbnail is a relative path on the allen drive then preprend it to
        // the AICS FMS NGINX server path
        if (this.thumbnail.startsWith("/allen")) {
            const pathWithoutDrive = this.thumbnail.replace(NAS_HOST_PREFIXES[this.env], "");
            return FileDetail.convertAicsS3PathToHttpUrl(
                `${AICS_FMS_S3_BUCKETS[this.env]}${pathWithoutDrive}`
            );
        }

        // Try to render a thumbnail from the zarr if the thumbnail is a zarr
        // and isn't a local file (since we can't read local zarrs in the browser)
        if (this.thumbnail.includes(".zarr") && !FileDetail.isLikelyLocalFile(this.thumbnail)) {
            return renderZarrThumbnailURL(this.thumbnail, targetSize);
        }

        return this.thumbnail;
    }

    public getLinkToPlateUI(labkeyHost: string): string | undefined {
        // Grabbing plate barcode
        const platebarcode = this.getFirstAnnotationValue(AnnotationName.PLATE_BARCODE);
        if (!platebarcode) {
            return undefined;
        }
        return `${labkeyHost}/labkey/aics_microscopy/AICS/editPlate.view?Barcode=${platebarcode}`;
    }
}
