/**
 * Accepts date/time string (UTC offset must be specified), outputs stringified, formatted version of just the date.
 * Should be replaced by a proper date parsing and formatting library like moment as soon as it matters.
 *
 * Heuristic: all Date type annotation values are in UTC and have their time components (hours, minutes, etc) zeroed out
 */
export default {
    displayValue(value: string): string {
        const date = new Date(value);

        // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat
        // for options
        const options = {
            month: "2-digit",
            day: "2-digit",
            year: "numeric",
            timeZone: "UTC",
        };
        const formatted = new Intl.DateTimeFormat("en-US", options).format(date);
        const [month, day, year] = formatted.split("/");
        return `${year}-${month}-${day}`;
    },

    valueOf(value: any) {
        return value;
    },
};
