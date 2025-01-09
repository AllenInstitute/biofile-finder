// TypeScript (3.9) raises a bizarre error if this is an enum
// Reference issue without clear resolution: https://github.com/microsoft/TypeScript/issues/6307
export default {
    KIND: "Kind", // matches an annotation in filemetadata.annotation
    FILE_ID: "file_id", // a file attribute (top-level prop on file documents in MongoDb)
    FILE_NAME: "file_name", // a file attribute (top-level prop on file documents in MongoDb)
    FILE_SIZE: "file_size", // a file attribute (top-level prop on file documents in MongoDb)
    FILE_PATH: "file_path", // a file attribute (top-level prop on file documents in MongoDb)
    LOCAL_FILE_PATH: "Local File Path", // (optional) annotation for FMS files on the local NAS
    PLATE_BARCODE: "Plate Barcode",
    SHOULD_BE_IN_LOCAL: "Should Be in Local Cache",
    THUMBNAIL_PATH: "thumbnail", // (optional) file attribute (top-level prop on the file documents in MongoDb)
    TYPE: "Type", // matches an annotation in filemetadata.annotation
    UPLOADED: "uploaded", // matches an annotation in filemetadata.annotation
};
