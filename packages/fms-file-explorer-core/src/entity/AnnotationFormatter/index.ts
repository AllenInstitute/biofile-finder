import dateFormatter from "./date-formatter";
import identityFormatter from "./identity-formatter";
import numberFormatter from "./number-formatter";

export interface AnnotationFormatter {
    (value: any, unit?: string): string;
}

/**
 * TODO: (GM 10/21/2019) These need to match up with some database values.
 */
export enum AnnotationType {
    DATE = "date/time",
    NUMBER = "number",
    STRING = "string",
}

export default function annotationFormatterFactory(type: string): AnnotationFormatter {
    switch (type) {
        case AnnotationType.DATE:
            return dateFormatter;
        case AnnotationType.NUMBER:
            return numberFormatter;
        case AnnotationType.STRING:
        default:
            // FALL-THROUGH
            return identityFormatter;
    }
}
