import dateFormatter from "./date-formatter";
import identityFormatter from "./identity-formatter";
import numberFormatter from "./number-formatter";

/**
 * TODO: (GM 10/21/2019) These need to match up with some database values.
 */
export enum AnnotationType {
    DATE = "date/time",
    NUMBER = "number",
    STRING = "string",
}

export interface AnnotationFormatter {
    (value: any, unit?: string): string;
}

/**
 * Factory to return annotation formatter functions. Annotation formatters are responsible for accepting some value and
 * readying that value for presentation according to the values intended type.
 */
export default function annotationFormatterFactory(type: string): AnnotationFormatter {
    switch (type) {
        case AnnotationType.DATE:
            return dateFormatter;
        case AnnotationType.NUMBER:
            return numberFormatter;
        case AnnotationType.STRING:
        // prettier-ignore
        default: // FALL-THROUGH
            return identityFormatter;
    }
}
