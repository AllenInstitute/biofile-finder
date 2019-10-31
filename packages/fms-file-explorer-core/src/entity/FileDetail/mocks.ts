import { sampleSize } from "lodash";

import { FileDetailResponse } from "./";

const userAnnotations = [
    {
        annotation_id: 5,
        values: ["AICS_10", "AICS_12"],
        position: null,
        channel: null,
        time: null,
    },
    {
        annotation_id: 6,
        values: [true],
        position: null,
        channel: 1,
        time: null,
    },
    {
        annotation_id: 7,
        values: [true],
        position: 2,
        channel: null,
        time: null,
    },
    {
        annotation_id: 8,
        values: [932829],
        position: 2,
        channel: 2,
        time: 1,
    },
];

export function makeFileDetailMock(id: string): FileDetailResponse {
    const detail = {
        annotations: sampleSize(
            userAnnotations,
            Math.round(Math.random() * userAnnotations.length)
        ),
        channels: [
            { id: 1, name: "GFP channel", laser_power: 10, exposure_time: 100 },
            { id: 2, name: "Brightfield", laser_power: 1, exposure_time: 10 },
        ],
        file_id: id,
        positions: [
            { id: 1, name: "Tiled region one", x: 3002382.939, y: 29384309328.2 },
            { id: 2, name: "Position 2", x: 93849.288, y: 710383.19 },
        ],
        times: [{ id: 1, deltaT: "00:05:07.39" }],
        thumbnail:
            "https://s3-us-west-2.amazonaws.com/production.imsc-visual-essay.allencell.org/assets/Cell-grid-images-144ppi/ACTB_Interphase.png",
        uploaded: new Date().toISOString(),
        uploadedBy: "Jackson",
    };
    return detail;
}
