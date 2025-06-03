import { extractDatesFromRangeOperatorFilterString } from "./date-time-formatter";
/**
 * Accepts date/time string (UTC offset must be specified), outputs stringified, formatted version of just the date.
 * Should be replaced by a proper date parsing and formatting library like moment as soon as it matters.
 *
 * Heuristic: all Date type annotation values are in UTC and have their time components (hours, minutes, etc) zeroed out
 */
export default {
    displayValue(value: string): string {
        // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat
        // for options
        const options = {
            month: "2-digit",
            day: "2-digit",
            year: "numeric",
            // TODO: Having date-time in local time and date in UTC creates UI inconsistency problems
            timeZone: "UTC",
        } as Intl.DateTimeFormatOptions;

        const { startDate, endDate } = extractDatesFromRangeOperatorFilterString(value);
        const formatDate = (date: Date) => {
            const formatted = new Intl.DateTimeFormat("en-US", options).format(date);
            const [month, day, year] = formatted.split("/");
            return `${year}-${month}-${day}`;
        };
        if (startDate && endDate) {
            return `${formatDate(startDate)}, ${formatDate(endDate)}`;
        } else {
            try {
                const date = new Date(value);
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
