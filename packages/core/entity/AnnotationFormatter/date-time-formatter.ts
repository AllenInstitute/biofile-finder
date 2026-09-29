/**
 * Accepts date/time string (UTC offset must be specified), outputs stringified version in PST.
 * Should be replaced by a proper date parsing and formatting library like moment as soon as it matters.
 */
// Equivalent to `date.toLocaleString(undefined, { timeZone: "America/Los_Angeles" })`: when no
// date/time fields are given, toLocaleString defaults all six to "numeric". Constructing an
// Intl.DateTimeFormat per call is expensive (~25µs), so a single shared instance is used instead.
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
});

export default {
    displayValue(value: string): string {
        const { startDate, endDate } = extractDatesFromRangeOperatorFilterString(value);
        if (startDate && endDate) {
            return `${DATE_TIME_FORMATTER.format(startDate)}; ${DATE_TIME_FORMATTER.format(
                endDate
            )}`;
        } else {
            try {
                // duckdb-wasm returns timestamp values as BigInt ms-since-epoch, which the
                // runQuery JSON replacer converts to a numeric string (e.g. "1645833600000").
                const coerced = /^\d+$/.test(String(value)) ? Number(value) : value;
                const date = new Date(coerced);
                return DATE_TIME_FORMATTER.format(date);
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

export function extractDatesFromRangeOperatorFilterString(
    filterString: string
): { startDate: Date | undefined; endDate: Date | undefined } {
    // Regex with capture groups for identifying ISO datestrings in the RANGE() filter operator
    // e.g. RANGE(2022-01-01T00:00:00.000Z,2022-01-31T00:00:00.000Z)
    // Captures "2022-01-01T00:00:00.000Z" and "2022-01-31T00:00:00.000Z"
    const RANGE_OPERATOR_REGEX = /RANGE\(([\d\-\+:TZ.]+),([\d\-\+:TZ.]+)\)/g;
    const exec = RANGE_OPERATOR_REGEX.exec(filterString);
    let startDate, endDate;
    if (exec && exec.length === 3) {
        // Length of 3 because we use two capture groups
        startDate = new Date(exec[1]);
        endDate = new Date(exec[2]);
    }
    return { startDate, endDate };
}
