/**
 * Accepts date/time string (UTC offset must be specified), outputs stringified, formatted version of just the date.
 * Should be replaced by a proper date parsing and formatting library like moment as soon as it matters.
 */
export default {
    displayValue(value: string): string {
        const date = new Date(value);
        const options = {
            month: "2-digit",
            day: "2-digit",
            year: "numeric",
            timeZone: "America/Los_Angeles",
        };
        const formatted = new Intl.DateTimeFormat("en-US", options).format(date);
        const [month, day, year] = formatted.split("/");
        return `${year}-${month}-${day}`;
    },

    valueOf(value: any) {
        return value;
    },
};
