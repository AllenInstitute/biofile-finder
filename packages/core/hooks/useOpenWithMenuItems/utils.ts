import FileDetail from "../../entity/FileDetail";

export function getFileExtension(fileDetails: FileDetail): string {
    return fileDetails.path.slice(fileDetails.path.lastIndexOf(".") + 1).toLowerCase();
}
