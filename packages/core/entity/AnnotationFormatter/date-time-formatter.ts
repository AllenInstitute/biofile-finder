/**
 * Accepts date/time string (UTC offset must be specified), outputs stringified version in PST.
 * Should be replaced by a proper date parsing and formatting library like moment as soon as it matters.
 */
export default {
    displayValue(value: string): string {
        const { startDate, endDate } = extractDatesFromRangeOperatorFilterString(value);
        const options = { timeZone: "America/Los_Angeles" };
        if (startDate && endDate) {
            return `${startDate.toLocaleString(undefined, options)}; ${endDate.toLocaleString(
                undefined,
                options
            )}`;
        } else {
            try {
                const date = new Date(value);
                return date.toLocaleString(undefined, options);
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
