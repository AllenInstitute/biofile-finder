import Tutorial from "../../../entity/Tutorial";

export const ORGANIZE_FILES_TUTORIAL = new Tutorial("Organizing")
    .addStep({
        targetId: Tutorial.ANNOTATION_LIST_ID,
        message:
            'All annotations that have files tagged with them are present in this list. Drag and drop an annotation in this list into the "Annotation Hierarchy" above (try "Cell Line" for example).',
    })
    .addStep({
        targetId: Tutorial.FILE_LIST_ID,
        message:
            "Each folder represents a value for the annotation and the files within the folder are guaranteed to have been annotated with that annotation name + value",
    })
    .addStep({
        targetId: Tutorial.ANNOTATION_HIERARCHY_ID,
        message:
            "This will display the hierarchy of the dynamically generated folders to the right which are determined by the order in which you add annotations to this hierarchy (they can be rearranged by dragging them around)",
    });
