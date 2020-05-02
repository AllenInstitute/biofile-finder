/**
 * Accepts date/time string (UTC offset must be specified), outputs stringified, formatted version of just the date.
 * Should be replaced by a proper date parsing and formatting library like moment as soon as it matters.
 */
export default {
    displayValue(value: string): string {
        const date = new Date(value);

        // Date::getMonth is awkwardly 0-indexed
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
            date.getDate()
        ).padStart(2, "0")}`;
    },

    valueOf(value: any) {
        return value;
    },
};
