import AnnotationName from "../Annotation/AnnotationName";
import { FmsFileAnnotation } from "../../services/FileService";
import { renderZarrThumbnailURL } from "./RenderZarrThumbnailURL";
import { Environment } from "../../constants";

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

/**
 * Facade for a FileDetailResponse.
 */
export default class FileDetail {
    private readonly fileDetail: FmsFile;
    private readonly env: Environment;
    private readonly uniqueId?: string;

    private static convertAicsS3PathToHttpUrl(path: string): string {
        return `${AICS_FMS_S3_URL_PREFIX}${path}`;
    }

    constructor(fileDetail: FmsFile, env: Environment, uniqueId?: string) {
        this.fileDetail = fileDetail;
        this.env = env;
        this.uniqueId = uniqueId;
    }

    public get details() {
        return this.fileDetail;
    }

    public get uid(): string {
        return this.uniqueId || this.id;
    }

    public get id(): string {
        const id = this.fileDetail.file_id || this.getFirstAnnotationValue("File ID") || this.getFirstAnnotationValue("File Name");
        if (id === undefined) {
            throw new Error("File ID is not defined");
        }
        return id as string;
    }

    public get name(): string {
        const name = this.fileDetail.file_name || this.getFirstAnnotationValue("File Name");
        if (name === undefined) {
            throw new Error("File Name is not defined");
        }
        return name as string;
    }

    public get path(): string {
        const path = this.fileDetail.file_path || this.getFirstAnnotationValue("File Path");
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

    public get isLikelyLocalFile(): boolean {
        return !this.path.startsWith("http") && !this.path.startsWith("s3");
    }

    public get downloadInProgress(): boolean {
        const shouldBeInLocal = this.getFirstAnnotationValue(AnnotationName.SHOULD_BE_IN_LOCAL);
        const cacheEvictionDate = this.getAnnotation(AnnotationName.CACHE_EVICTION_DATE);
        return !cacheEvictionDate && shouldBeInLocal === true;
    }

    public get size(): number | undefined {
        const size = this.fileDetail.file_size || this.getFirstAnnotationValue("File Size");
        if (size === undefined) {
            return 0; // Default to 0 if size is not defined for now, need better system
        }
        if (typeof size === "number") {
            return size;
        }
        return parseInt(size as string, 10);
    }

    public get thumbnail(): string | undefined {
        return (
            this.fileDetail.thumbnail ||
            (this.getFirstAnnotationValue("Thumbnail") as string | undefined)
        );
    }

    public get annotations() {
        return this.fileDetail.annotations;
    }

    public getFirstAnnotationValue(annotationName: string): string | number | boolean | undefined {
        return this.getAnnotation(annotationName)?.values[0];
    }

    public getAnnotation(annotationName: string): FmsFileAnnotation | undefined {
        return this.fileDetail.annotations.find((annotation) => annotation.name === annotationName);
    }

    public async getPathToThumbnail(targetSize?: number): Promise<string | undefined> {
        // If the thumbnail is a relative path on the allen drive then preprend it to
        // the AICS FMS NGINX server path
        if (this.thumbnail?.startsWith("/allen")) {
            const pathWithoutDrive = this.thumbnail.replace(NAS_HOST_PREFIXES[this.env], "");
            return FileDetail.convertAicsS3PathToHttpUrl(
                `${AICS_FMS_S3_BUCKETS[this.env]}${pathWithoutDrive}`
            );
        }

        // If no thumbnail present try to render the file itself as the thumbnail
        if (!this.thumbnail) {
            // Cannot currently read locally stored zarrs on web
            if (this.path.includes(".zarr") && !this.isLikelyLocalFile) {
                return renderZarrThumbnailURL(this.path, targetSize);
            }

            const isFileRenderableImage = RENDERABLE_IMAGE_FORMATS.some((format) =>
                this.path.toLowerCase().endsWith(format)
            );
            if (isFileRenderableImage) {
                return this.path;
            }
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

    public getAnnotationNameToLinkMap(): { [annotationName: string]: string } {
        return this.annotations
            .filter(
                (annotation) =>
                    typeof annotation.values[0] === "string" &&
                    annotation.values[0].startsWith("http") &&
                    !["File Path", "Thumbnail"].includes(annotation.name)
            )
            .reduce(
                (mapThusFar, annotation) => ({
                    ...mapThusFar,
                    [annotation.name]: annotation.values.join(",") as string,
                }),
                {} as { [annotationName: string]: string }
            );
    }
}
