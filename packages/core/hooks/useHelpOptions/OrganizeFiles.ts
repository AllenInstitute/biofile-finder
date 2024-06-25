import Tutorial from "../../entity/Tutorial";

export const ORGANIZE_FILES_TUTORIAL = new Tutorial("Organizing")
    .addStep({
        targetId: Tutorial.GROUPING_HEADER_ID,
        message:
            "All annotations that have files tagged with them are present in the list shown by this button. Click an annotation to group the files seen on the right into groups determined by the metadata tag chosen.",
    })
    .addStep({
        targetId: Tutorial.FILE_LIST_ID,
        message:
            "Each folder represents a value for the annotation. The files within the folder are guaranteed to have been annotated with that annotation name + value.",
    })
    .addStep({
        targetId: Tutorial.GROUPING_HEADER_ID,
        message: "Groups can be reordered by dragging and dropping the tags in the list below.",
    });
