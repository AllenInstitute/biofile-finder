import filesize from "filesize";

export default {
    displayValue(value: string | number, units?: string): string {
        const splitValues = extractValuesFromRangeOperatorFilterString(value.toString());
        const formatNumber = (val: string | number) => {
            if (units === "bytes") {
                return filesize(Number(val));
            }
            return `${val}${units ? " " + units : ""}`;
        };
        if (splitValues) {
            const minValue = formatNumber(splitValues?.minValue);
            const maxValue = formatNumber(splitValues?.maxValue);
            return `[${minValue},${maxValue})`;
        }
        return formatNumber(value);
    },

    valueOf(value: any) {
        return Number(value);
    },
};

export function extractValuesFromRangeOperatorFilterString(
    filterString: string
): { minValue: string; maxValue: string } | null {
    // Regex with capture groups for identifying values in the RANGE() filter operator
    // e.g. RANGE(-.1, 10) captures "-.1" and "10"
    // Does not check for valid values, just captures existing floats
    const RANGE_OPERATOR_REGEX = /RANGE\(([\d\-.]+),\s?([\d\-.]+)\)/g;
    const exec = RANGE_OPERATOR_REGEX.exec(filterString);
    if (exec && exec.length === 3) {
        const minValue = exec[1];
        const maxValue = exec[2]; // TODO: Revisit inclusive vs exclusive upper bound
        return { minValue, maxValue };
    }
    return null;
}
