import { AnnotationType } from "../AnnotationFormatter";

export const annotationsJson = [
    {
        annotationDisplayName: "Date created",
        path: ["date_created"],
        description: "Date and time file was created",
        type: AnnotationType.DATETIME,
    },
    {
        annotationDisplayName: "Cell line",
        path: ["cell_line"],
        description: "AICS cell line",
        type: AnnotationType.STRING,
    },
    {
        annotationDisplayName: "Cells are dead",
        path: ["cell_dead"],
        description: "Does this field contain dead cells",
        type: AnnotationType.BOOLEAN,
    },
    {
        annotationDisplayName: "Is matrigel hard?",
        path: ["matrigel_hardened"],
        description: "Whether or not matrigel is hard.",
        type: AnnotationType.BOOLEAN,
    },
    {
        annotationDisplayName: "Objective",
        path: ["objective"],
        description: "Imaging objective",
        type: AnnotationType.NUMBER,
    },
    {
        path: ["Local File Path"],
        annotationDisplayName: "Local File Path",
        description: "Path to file in on-premises storage.",
        type: AnnotationType.STRING,
    },
];
