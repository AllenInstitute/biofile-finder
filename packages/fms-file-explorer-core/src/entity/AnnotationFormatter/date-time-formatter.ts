/**
 * Accepts ISO date string in UTC (e.g.: '2017-12-06T01:54:01.332Z'), outputs something like: mm/dd/yyyy, hh:mm:ss [A|P]M
 * (e.g., '12/5/2017, 5:54:01 PM'). Should be replaced by a proper date parsing and formatting library, like moment, as
 * soon as it matters.
 */
export default function dateTimeFormatter(value: string): string {
    const date = new Date(value);
    const options = { timeZone: "America/Los_Angeles" };

    // heuristic: if hours, minutes, and seconds are zeroed out, return just the date string
    // can only store datetimes in Mongo, so date's are stored as datetimes with the hours, minutes, and seconds zeroed out
    if (date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0) {
        return date.toLocaleDateString(undefined, options);
    }

    return date.toLocaleString(undefined, options);
}
