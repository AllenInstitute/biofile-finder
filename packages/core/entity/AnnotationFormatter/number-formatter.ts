import filesize from "filesize";

export default {
    displayValue(value: string | number, units?: string): string {
        const { minValue, maxValue } = extractValuesFromRangeOperatorFilterString(value.toString());
        const formatNumber = (val: string | number) => {
            if (units === "bytes") {
                return filesize(Number(val));
            }
            return `${val}${units ? " " + units : ""}`;
        };
        if (minValue && maxValue) {
            return `[${formatNumber(minValue)},${formatNumber(maxValue)})`;
        }
        return formatNumber(value);
    },

    valueOf(value: any) {
        return Number(value);
    },
};

export function extractValuesFromRangeOperatorFilterString(
    filterString: string
): { minValue: string | undefined; maxValue: string | undefined } {
    // Regex with capture groups for identifying values in the RANGE() filter operator
    // e.g. RANGE(-.1, 10) captures "-.1" and "10"
    // Does not check for valid values, just captures existing floats
    const RANGE_OPERATOR_REGEX = /RANGE\(([\d\-.]+),\s?([\d\-.]+)\)/g;
    const exec = RANGE_OPERATOR_REGEX.exec(filterString);
    let minValue, maxValue;
    if (exec && exec.length === 3) {
        minValue = exec[1];
        maxValue = exec[2];
    }
    return { minValue, maxValue };
}
