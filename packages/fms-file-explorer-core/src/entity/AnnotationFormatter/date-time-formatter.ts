/**
 * Accepts date/time string in UTC (e.g.: '2017-12-06T01:54:01.332Z'), outputs stringified version in PST.
 * Should be replaced by a proper date parsing and formatting library like moment as soon as it matters.
 */
export default function dateTimeFormatter(value: string): string {
    const date = new Date(value);
    const options = { timeZone: "America/Los_Angeles" };

    // heuristic: if hours, minutes, and seconds are zeroed out, return just the date string
    // can only store datetimes in Mongo, so dates (presumably without times) are stored as datetimes
    // with the hours, minutes, and seconds zeroed out
    if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0) {
        return date.toLocaleDateString(undefined, options);
    }

    return date.toLocaleString(undefined, options);
}
