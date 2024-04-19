import { RENDERABLE_IMAGE_FORMATS } from "../../constants";
import { FmsFileAnnotation } from "../../services/FileService";

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

    public get size(): number {
        const size = this.fileDetail.file_size || this.getFirstAnnotationValue("File Size");
        if (size === undefined) {
            throw new Error("File Size is not defined");
        }
        return size as number;
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

    public getPathToThumbnail(): string | undefined {
        let thumbnailPath = this.thumbnail;

        // If no thumbnail present try to render the file itself as the thumbnail
        if (!thumbnailPath) {
            const fileExtension = this.name.toLowerCase();
            const isFileRenderableImage = RENDERABLE_IMAGE_FORMATS.some((format) =>
                fileExtension.endsWith(format)
            );
            if (isFileRenderableImage) {
                thumbnailPath = this.path;
            }
        }

        // If the thumbnail is a relative path on the allen drive then preprend it to
        // the AICS FMS NGINX server path
        if (thumbnailPath?.startsWith("/allen")) {
            return `http://aics.corp.alleninstitute.org/labkey/fmsfiles/image${thumbnailPath}`;
        }
        return this.thumbnail;
    }
}
