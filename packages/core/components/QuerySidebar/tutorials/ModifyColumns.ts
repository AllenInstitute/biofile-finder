import Tutorial from "../../../entity/Tutorial";

export const MODIFY_COLUMNS_TUTORIAL = new Tutorial("Modifying file list columns").addStep({
    targetId: Tutorial.COLUMN_HEADERS_ID,
    message:
        'The columns in the file list can be added or removed at will by right-clicking anywhere near the titles of the columns, selecting "Modify columns", and then selecting which columns to show. The width of a column can be changed by dragging the bars | following the column titles.',
});
