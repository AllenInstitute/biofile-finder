import Tutorial from "../../entity/Tutorial";

export const SORT_FILES_TUTORIAL = new Tutorial(
    "Sorting",
    "How to sort the files shown in the file list"
)
    .addStep({
        targetId: Tutorial.COLUMN_HEADERS_ID,
        message:
            'Files can be sorted by clicking the title of a column. By default, files are sorted by the "Uploaded" date. Can\'t find the column you want to sort by? To change which columns are displayed, see the "Modifying columns in file list" tutorial.',
    })
    .addStep({
        targetId: Tutorial.SORT_HEADER_ID,
        message:
            'You can also sort on any column by clicking the "Sort" button here and selecting a field from the list.',
    });
