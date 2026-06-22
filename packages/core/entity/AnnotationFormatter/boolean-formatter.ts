import { isBoolean } from "lodash";

import { PrimitiveMetadataValue } from "../../services/FileService";

const castBoolean = (value: string | boolean): boolean => {
    if (isBoolean(value)) return value;
    return value.toLowerCase() === "true"
        ? true
        : false;
};

export default {
    // TODO: What types does this actually get??
    displayValue(value: PrimitiveMetadataValue): string {
        if (typeof value === "number") {
            console.error(`Unexpected number value passed to boolean annotation formatter: ${value}`);
            return "";
        }
        return castBoolean(value)
            ? "True"
            : "False";
    },

    // TODO: What types does this actually get??
    valueOf(value: PrimitiveMetadataValue): boolean | undefined {
        if (typeof value === "number") {
            console.error(`Unexpected number value passed to boolean annotation formatter: ${value}`);
            return undefined;
        }
        return castBoolean(value);
    },
};
