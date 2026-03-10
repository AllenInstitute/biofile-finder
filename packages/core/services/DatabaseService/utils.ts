import { AnnotationType } from "../../entity/AnnotationFormatter";

export enum PreDefinedColumn {
    FILE_ID = "File ID",
    FILE_PATH = "File Path",
    FILE_NAME = "File Name",
    FILE_SIZE = "File Size",
    THUMBNAIL = "Thumbnail",
    UPLOADED = "Uploaded",
}

const PRE_DEFINED_COLUMNS = Object.values(PreDefinedColumn);
const HIDDEN_UID_ANNOTATION = "hidden_bff_uid";
const SOURCE_METADATA_TABLE = "source_metadata";
const SOURCE_PROVENANCE_TABLE = "source_provenance";
export {
    PRE_DEFINED_COLUMNS,
    HIDDEN_UID_ANNOTATION,
    SOURCE_METADATA_TABLE,
    SOURCE_PROVENANCE_TABLE,
};

export function columnTypeToAnnotationType(columnType: string): AnnotationType {
    switch (columnType) {
        case "INTEGER":
        case "BIGINT":
        // TODO: Add support for column types
        // https://github.com/AllenInstitute/biofile-finder/issues/60
        // return AnnotationType.NUMBER;
        case "VARCHAR":
        case "TEXT":
        default:
            return AnnotationType.STRING;
    }
}
