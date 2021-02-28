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
        // If the value isn't a string type there isn't any parsing to do
        if (typeof value !== "string") {
            return value;
        }
        return castBoolean(value);
    },
};
