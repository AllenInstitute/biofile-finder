import booleanFormatter from "./boolean-formatter";
import dateFormatter from "./date-formatter";
import dateTimeFormatter from "./date-time-formatter";
import identityFormatter from "./identity-formatter";
import numberFormatter from "./number-formatter";
import durationFormatter from "./duration-formatter";

export enum AnnotationType {
    DATE = "Date",
    DATETIME = "DateTime",
    NUMBER = "Number",
    STRING = "Text",
    BOOLEAN = "YesNo",
    DURATION = "Duration",
    DROPDOWN = "Dropdown",
    LOOKUP = "Lookup",
}

export interface AnnotationFormatter {
    displayValue(value: any, unit?: string): string;
    valueOf(value: any): string | number | boolean;
}

/**
 * Factory to return annotation formatter functions. Annotation formatters are responsible for accepting some value and
 * readying that value for presentation according to the values intended type.
 */
export default function annotationFormatterFactory(type: string): AnnotationFormatter {
    switch (type) {
        case AnnotationType.BOOLEAN:
            return booleanFormatter;
        case AnnotationType.DATE:
            return dateFormatter;
        case AnnotationType.DATETIME:
            return dateTimeFormatter;
        case AnnotationType.NUMBER:
            return numberFormatter;
        case AnnotationType.DURATION:
            return durationFormatter;
        case AnnotationType.STRING:
        // prettier-ignore
        default: // FALL-THROUGH
            return identityFormatter;
    }
}
