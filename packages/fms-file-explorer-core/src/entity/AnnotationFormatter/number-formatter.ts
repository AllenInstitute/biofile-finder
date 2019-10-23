import filesize from "filesize";

export default function numberFormatter(value: string | number, units?: string): string {
    if (units === "bytes") {
        return filesize(Number(value));
    }

    return `${value}${units ? " " + units : ""}`;
}
