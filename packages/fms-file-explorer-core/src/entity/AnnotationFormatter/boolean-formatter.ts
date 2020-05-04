import { isBoolean } from "lodash";

const castBoolean = (value: string | boolean): boolean => {
    if (isBoolean(value)) {
        return value;
    }

    if (value.toLowerCase() === "true") {
        return true;
    }

    return false;
};

export default {
    displayValue(value: string | boolean): string {
        if (castBoolean(value)) {
            return "True";
        }

        return "False";
    },

    valueOf(value: any) {
        return value;
    },
};
