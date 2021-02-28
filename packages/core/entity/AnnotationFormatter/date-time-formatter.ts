/**
 * Accepts date/time string (UTC offset must be specified), outputs stringified version in PST.
 * Should be replaced by a proper date parsing and formatting library like moment as soon as it matters.
 */
export default {
    displayValue(value: string): string {
        const date = new Date(value);
        const options = { timeZone: "America/Los_Angeles" };
        return date.toLocaleString(undefined, options);
    },

    valueOf(value: any) {
        return value;
    },
};
