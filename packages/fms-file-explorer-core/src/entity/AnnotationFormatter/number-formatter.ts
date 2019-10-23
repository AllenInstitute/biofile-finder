import * as prettyBytes from "pretty-bytes";

export default function numberFormatter(value: string | number, units?: string): string {
    if (units === "bytes") {
        return prettyBytes(Number(value));
    }

    return `${value}${units ? " " + units : ""}`;
}
