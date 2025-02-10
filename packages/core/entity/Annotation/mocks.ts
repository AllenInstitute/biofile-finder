import { AnnotationType } from "../AnnotationFormatter";

export const annotationsJson = [
    {
        annotationDisplayName: "Date created",
        annotationName: "date_created",
        description: "Date and time file was created",
        type: AnnotationType.DATETIME,
    },
    {
        annotationDisplayName: "Cell line",
        annotationName: "cell_line",
        description: "AICS cell line",
        type: AnnotationType.STRING,
    },
    {
        annotationDisplayName: "Cells are dead",
        annotationName: "cell_dead",
        description: "Does this field contain dead cells",
        type: AnnotationType.BOOLEAN,
    },
    {
        annotationDisplayName: "Is matrigel hard?",
        annotationName: "matrigel_hardened",
        description: "Whether or not matrigel is hard.",
        type: AnnotationType.BOOLEAN,
    },
    {
        annotationDisplayName: "Objective",
        annotationName: "objective",
        description: "Imaging objective",
        type: AnnotationType.NUMBER,
    },
    {
        annotationName: "Local File Path",
        annotationDisplayName: "Local File Path",
        description: "Path to file in on-premises storage.",
        type: AnnotationType.STRING,
    },
];
