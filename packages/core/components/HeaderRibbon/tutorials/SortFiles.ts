import Tutorial from "../../../entity/Tutorial";

export const SORT_FILES_TUTORIAL = new Tutorial("Sorting").addStep({
    targetId: Tutorial.COLUMN_HEADERS_ID,
    message:
        'Files can be sorted by clicking the title of a column. By default, files are sorted by the "Uploaded" date. Can\'t find the column you want to sort by? To modify the columns shown so that you can sort by another column, see the "Modifying columns in file list" tutorial.',
});
