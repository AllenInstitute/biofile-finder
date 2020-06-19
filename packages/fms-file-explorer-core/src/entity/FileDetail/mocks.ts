import { sampleSize } from "lodash";

import { FmsFile, FmsFileAnnotation } from "../../services/FileService";

const userAnnotations: FmsFileAnnotation[] = [
    {
        name: "Cell Line",
        values: ["AICS_10", "AICS_12"],
    },
    {
        name: "isImage",
        values: [true],
    },
    {
        name: "qc",
        values: [true],
    },
    {
        name: "Days Since Last Seen Light",
        values: [932829],
    },
];

export function makeFileDetailMock(id: string): FmsFile {
    const detail = {
        annotations: sampleSize(
            userAnnotations,
            Math.round(Math.random() * userAnnotations.length)
        ),
        channels: [{ id: 1 }, { id: 2 }],
        fileId: id,
        fileName: "mockfile.png",
        filePath: "some/path/to/mockfile.png",
        fileSize: 1,
        fileType: "image",
        positions: [{ id: 1 }, { id: 2 }],
        times: [{ id: 1 }],
        thumbnailPath:
            "https://s3-us-west-2.amazonaws.com/production.imsc-visual-essay.allencell.org/assets/Cell-grid-images-144ppi/ACTB_Interphase.png",
        uploaded: new Date().toISOString(),
        uploadedBy: "Jackson",
    };
    return detail;
}
