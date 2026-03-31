import Tutorial from "../../entity/Tutorial";

export const FILTER_FILES_TUTORIAL = new Tutorial(
    "Filtering",
    "How to filter files in the file list"
)
    .addStep({
        targetId: Tutorial.FILTER_HEADER_ID,
        message:
            'Filter for specific annotation values by clicking "Filter +", which opens a menu of all fields available in these data source(s).',
    })
    .addStep({
        targetId: Tutorial.FILTER_HEADER_ID,
        message:
            "Select or search for the name of the field you'd like to filter by, and click to see available values.",
    })
    .addStep({
        targetId: Tutorial.FILE_ATTRIBUTE_FILTER_ID,
        message:
            'Filter on the selected field by entering a value here. Values do not have to be exact, e.g., entering a File Name of "ZSD1" would return all file names starting with or containing "ZSD1".',
    });
