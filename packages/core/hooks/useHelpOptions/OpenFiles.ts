import Tutorial from "../../entity/Tutorial";

export const OPEN_FILES_TUTORIAL = new Tutorial(
    "Opening files in another application",
    "How to open a file in another application without downloading or copying and pasting the file path"
)
    .addStep({
        targetId: Tutorial.FILE_LIST_ID,
        message:
            "You can open files from the file list using other applications. Start by selecting the file you want to open.",
    })
    .addStep({
        targetId: Tutorial.OPEN_WITH_ID,
        message: `Click "Open with" in the file details panel to view a list of available applications with which you can open the file.
            Applications that are most likely to support your file are listed at the top of the menu. 
            All other available applications can be found in the "Other apps" sub-menu.`,
    })
    .addStep({
        targetId: Tutorial.FILE_LIST_ID,
        message:
            'You can also find this menu by right-clicking your selected file in the file list and selecting "Open with".',
    });
