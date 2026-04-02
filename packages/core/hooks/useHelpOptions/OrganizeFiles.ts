import Tutorial from "../../entity/Tutorial";

export const ORGANIZE_FILES_TUTORIAL = new Tutorial(
    "Grouping",
    "How to organize the files in the file list into hierarchical folders using the annotations"
)
    .addStep({
        targetId: Tutorial.GROUPING_HEADER_ID,
        message:
            'Click the "Group by" button to display a list of all annotations available in this data source. Select an annotation to group files by value for that annotation.',
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
