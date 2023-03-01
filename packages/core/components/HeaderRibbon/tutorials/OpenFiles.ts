import Tutorial from "../../../entity/Tutorial";

export const OPEN_FILES_TUTORIAL = new Tutorial("Opening files")
    .addStep({
        targetId: Tutorial.FILE_LIST_ID,
        message:
            "Select the file you want to open (or at least one you could open like maybe a CZI)",
    })
    .addStep({
        targetId: Tutorial.FILE_LIST_ID,
        message:
            'Right-click the now highlighted file and select "Open with" to select a specific application with which to open the file in. You can also have the explorer guess at which application to open by selecting the "Open" option instead, this will open the file in the default application your computer has saved for this file type or just the last application used to open the same type',
    });
