import filesize from "filesize";

import { PrimitiveMetadataValue } from "../../services/FileService";

function formatNumber(val: PrimitiveMetadataValue, units?: string): string {
    if (units === "bytes") {
        const num = Number(val);
        if (isNaN(num)) return String(val);
        return filesize(num);
    }
    return `${val}${units ? " " + units : ""}`;
};

export default {
    displayValue(value: PrimitiveMetadataValue, units?: string): string {
        const { minValue, maxValue } = extractValuesFromRangeOperatorFilterString(String(value));
        if (minValue && maxValue) {
            return `[${formatNumber(minValue, units)},${formatNumber(maxValue, units)})`;
        }

        return formatNumber(value, units);
    },

    valueOf(value: PrimitiveMetadataValue): number {
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
