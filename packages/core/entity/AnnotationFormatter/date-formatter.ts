import { extractDatesFromRangeOperatorFilterString } from "./date-time-formatter";

/**
 * Accepts date/time string (UTC offset must be specified), outputs stringified, formatted version of just the date.
 * Should be replaced by a proper date parsing and formatting library like moment as soon as it matters.
 *
 * Heuristic: all Date type annotation values are in UTC and have their time components (hours, minutes, etc) zeroed out
 */
// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat
// for options. Constructing an Intl.DateTimeFormat is expensive (~25µs), so a single shared
// instance is created once here rather than per formatted value.
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    // TODO: Having date-time in local time and date in UTC creates UI inconsistency problems
    timeZone: "UTC",
});

const formatDate = (date: Date) => {
    const [month, day, year] = DATE_FORMATTER.format(date).split("/");
    return `${year}-${month}-${day}`;
};

export default {
    displayValue(value: string): string {
        const { startDate, endDate } = extractDatesFromRangeOperatorFilterString(value);
        if (startDate && endDate) {
            return `${formatDate(startDate)}, ${formatDate(endDate)}`;
        } else {
            try {
                // duckdb-wasm returns date values as BigInt ms-since-epoch, which the
                // runQuery JSON replacer converts to a numeric string (e.g. "1645833600000").
                const coerced = /^\d+$/.test(String(value)) ? Number(value) : value;
                const date = new Date(coerced);
                return formatDate(date);
            } catch {
                // If can't convert the value to a date,
                // send error to console instead of throwing so app doesn't crash
                console.error(`Unable to convert value ${value} to Date`);
                return "";
            }
        }
    },

    valueOf(value: any) {
        return value;
    },
};
