import AnnotationName from "../Annotation/AnnotationName";
import { FmsFileAnnotation } from "../../services/FileService";
import { renderZarrThumbnailURL } from "./RenderZarrThumbnailURL";

const RENDERABLE_IMAGE_FORMATS = [".jpg", ".jpeg", ".png", ".gif"];

// Should probably record this somewhere we can dynamically adjust to, or perhaps just in the file
// document itself, alas for now this will do.
const HARD_CODED_AICS_S3_BUCKET_PATH = "http://production.files.allencell.org.s3.amazonaws.com";

const AICS_FMS_FILES_NGINX_SERVER = "http://aics.corp.alleninstitute.org/labkey/fmsfiles/image";

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
    private fileDetail: FmsFile;

    constructor(fileDetail: FmsFile) {
        this.fileDetail = fileDetail;
    }

    public get details() {
        return this.fileDetail;
    }

    public get id(): string {
        const id = this.fileDetail.file_id || this.getFirstAnnotationValue("File ID");
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
        return path as string;
    }

    public get cloudPath(): string {
        // Can retrieve a cloud like path for AICS FMS files
        if (this.path.startsWith("/allen")) {
            const pathWithoutDrive = this.path.replace("/allen/programs/allencell/data/proj0", "");
            return `${HARD_CODED_AICS_S3_BUCKET_PATH}${pathWithoutDrive}`;
        }

        return this.path;
    }

    public get downloadPath(): string {
        if (!this.path.startsWith("/allen")) {
            return this.path;
        }

        // For AICS files we don't have permission to the bucket nor do we expect to have the /allen
        // drive mounted on the client machine. So we use the NGINX server to serve the file.
        return `${AICS_FMS_FILES_NGINX_SERVER}${this.path}`;
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

    public async getPathToThumbnail(): Promise<string | undefined> {
        // If the thumbnail is a relative path on the allen drive then preprend it to
        // the AICS FMS NGINX server path
        if (this.thumbnail?.startsWith("/allen")) {
            return `${AICS_FMS_FILES_NGINX_SERVER}${this.thumbnail}`;
        }

        // If no thumbnail present try to render the file itself as the thumbnail
        if (!this.thumbnail) {
            const isFileRenderableImage = RENDERABLE_IMAGE_FORMATS.some((format) =>
                this.name.toLowerCase().endsWith(format)
            );
            if (isFileRenderableImage) {
                return this.downloadPath;
            }
            if (this.path.endsWith(".zarr")) {
                return await renderZarrThumbnailURL(this.path);
            }
        }

        return this.thumbnail;
    }

    public getLinkToPlateUI(baseURL: string): string | undefined {
        // Grabbing plate barcode
        const platebarcode = this.getFirstAnnotationValue(AnnotationName.PLATE_BARCODE);

        if (!platebarcode) {
            return undefined;
        }

        const baseURLHttp = baseURL.replace("https", "http");
        return `${baseURLHttp}/labkey/aics_microscopy/AICS/editPlate.view?Barcode=${platebarcode}`;
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
                    [annotation.name]: annotation.values[0] as string,
                }),
                {} as { [annotationName: string]: string }
            );
    }
}
