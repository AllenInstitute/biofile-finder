import { sampleSize } from "lodash";

import FileDetail from ".";
import { FmsFileAnnotation } from "../../services/FileService";
import { Environment } from "../../constants";

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

export function makeFileDetailMock(id: string): FileDetail {
    const detail = {
        annotations: sampleSize(
            userAnnotations,
            Math.round(Math.random() * userAnnotations.length)
        ),
        channels: [{ id: 1 }, { id: 2 }],
        file_id: id,
        file_name: "mockfile.png",
        file_path: "some/path/to/mockfile.png",
        file_size: 1,
        positions: [{ id: 1 }, { id: 2 }],
        times: [{ id: 1 }],
        thumbnail:
            "https://s3-us-west-2.amazonaws.com/production.imsc-visual-essay.allencell.org/assets/Cell-grid-images-144ppi/ACTB_Interphase.png",
        uploaded: new Date().toISOString(),
    };
    return new FileDetail(detail, Environment.TEST);
}
