/**
 * Accepts date/time string in UTC (e.g.: '2017-12-06T01:54:01.332Z'), outputs stringified version in PST.
 * Should be replaced by a proper date parsing and formatting library like moment as soon as it matters.
 */
export default {
    displayValue(value: string): string {
        const date = new Date(value);

        // heuristic: if hours, minutes, and seconds are zeroed out, return just the date string
        // can only store datetimes in Mongo, so dates (presumably without times) are stored as datetimes
        // with the hours, minutes, and seconds zeroed out
        if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0) {
            // Date::getUTCMonth is awkwardly 0-indexed; can't use toLocaleString because that will interpret as a day behind.
            return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
        }

        const options = { timeZone: "America/Los_Angeles" };
        return date.toLocaleString(undefined, options);
    },

    valueOf(value: any) {
        return value;
    },
};
