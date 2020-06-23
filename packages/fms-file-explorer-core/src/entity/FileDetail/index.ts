import { FmsFile } from "../../services/FileService";

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
 *     fileId: "26aa7881b8004dd0bcec857baf9a2f0a",
 *     thumbnailPath: "src/of/thumbnail",
 *     "uploaded": "2019-08-15 13:50:24",
 *     "uploadedBy": "svc_airflow",
 * }
 */

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

    public get id() {
        return this.fileDetail.fileId;
    }

    public get name() {
        return this.fileDetail.fileName;
    }

    public get path() {
        return this.fileDetail.filePath;
    }

    public get type() {
        return this.fileDetail.fileType;
    }

    public get thumbnail() {
        return this.fileDetail.thumbnailPath;
    }

    public get annotations() {
        return this.fileDetail.annotations;
    }
}
