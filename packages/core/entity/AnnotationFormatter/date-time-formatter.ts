import { PrimitiveMetadataValue } from "../../services/FileService";

const DATE_TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = { timeZone: "America/Los_Angeles" };
function toDateTimeString(date: Date): string {
    // TODO: Is it correct to have no locale?
    return date.toLocaleString(undefined, DATE_TIME_FORMAT_OPTIONS);
}

/**
 * Accepts date/time string (UTC offset must be specified), outputs stringified version in PST.
 * Should be replaced by a proper date parsing and formatting library like moment as soon as it matters.
 */
export default {
    // TODO: is this taking Date sometimes?
    displayValue(value: PrimitiveMetadataValue): string {
        return displayDate(value, toDateTimeString);
    },

    // TODO: ???
    valueOf(value: PrimitiveMetadataValue): PrimitiveMetadataValue {
        return value;
    },
};

export function extractDateRange(
    rangeAsString: string
): { startDate: Date | undefined; endDate: Date | undefined } {
    // Regex with capture groups for identifying ISO datestrings in the RANGE() filter operator
    // e.g. RANGE(2022-01-01T00:00:00.000Z,2022-01-31T00:00:00.000Z)
    // Captures "2022-01-01T00:00:00.000Z" and "2022-01-31T00:00:00.000Z"
    const RANGE_OPERATOR_REGEX = /RANGE\(([\d\-\+:TZ.]+),([\d\-\+:TZ.]+)\)/g;
    const exec = RANGE_OPERATOR_REGEX.exec(rangeAsString);
    let startDate, endDate;
    if (exec && exec.length === 3) {
        // Length of 3 because we use two capture groups
        startDate = new Date(exec[1]);
        endDate = new Date(exec[2]);
    }
    return { startDate, endDate };
}

// Re-usable function for displaying date-like values in both date and datetime formatters
// depending on the callback passed in which is used to format for String-like display
export function displayDate(value: PrimitiveMetadataValue, dateToStringCallback: (date: Date) => string): string {
    if (typeof value === "boolean") {
        console.error(`Unable to display boolean ${value} as Date or DateTime`);
        return "";
    }

    // If value is a string it may be a range of dates, try to extract the range first
    if (typeof value === "string") {
        const { startDate, endDate } = extractDateRange(value);
        if (startDate && endDate) {
            return `${dateToStringCallback(startDate)}; ${dateToStringCallback(endDate)}`;
        }
    }

    try {
        // duckdb-wasm returns timestamp values as BigInt ms-since-epoch, which the
        // runQuery JSON replacer converts to a numeric string (e.g. "1645833600000").
        const coersed = /^\d+$/.test(String(value)) ? Number(value) : value
        const date = new Date(coersed);
        return dateToStringCallback(date);
    } catch {
        // If can't convert the value to a date,
        // send error to console instead of throwing so app doesn't crash
        console.error(`Unable to convert value ${value} to Date or DateTime`);
        return "";
    }
}
