/**
 * Accepts ISO date string in UTC (e.g.: '2017-12-06T01:54:01.332Z'), outputs something like: mm/dd/yyyy, hh:mm:ss [A|P]M
 * (e.g., '12/5/2017, 5:54:01 PM'). Should be replaced by a proper date parsing and formatting library, like moment, as
 * soon as it matters.
 */
export default function dateFormatter(value: string) {
    const date = new Date(value);
    return date.toLocaleString(undefined, { timeZone: "America/Los_Angeles" });
}
