import * as filesize from "filesize";

export default {
    displayValue(value: string | number, units?: string): string {
        if (units === "bytes") {
            return filesize(Number(value));
        }

        return `${value}${units ? " " + units : ""}`;
    },

    valueOf(value: any) {
        return Number(value);
    },
};
