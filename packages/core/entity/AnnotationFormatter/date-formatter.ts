import { displayDate } from "./date-time-formatter";
import { PrimitiveMetadataValue } from "../../services/FileService";

// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat
// for options
const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    // TODO: Having date-time in local time and date in UTC creates UI inconsistency problems
    timeZone: "UTC",
};
function toDateString(date: Date): string {
    const formatted = new Intl.DateTimeFormat("en-US", DATE_FORMAT_OPTIONS).format(date);
    const [month, day, year] = formatted.split("/");
    return `${year}-${month}-${day}`;
};

/**
 * Accepts date/time string (UTC offset must be specified), outputs stringified, formatted version of just the date.
 * Should be replaced by a proper date parsing and formatting library like moment as soon as it matters.
 *
 * Heuristic: all Date type annotation values are in UTC and have their time components (hours, minutes, etc) zeroed out
 */
export default {
    displayValue(value: PrimitiveMetadataValue): string {
        return displayDate(value, toDateString);
    },

    // TODO: okay to return PrimitiveMetadataValue?
    valueOf(value: PrimitiveMetadataValue): PrimitiveMetadataValue {
        return value;
    },
};
