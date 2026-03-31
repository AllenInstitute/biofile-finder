import Tutorial from "../../entity/Tutorial";

export const CREATE_DATASET_TUTORIAL = new Tutorial(
    "Creating datasets (e.g., CSVs)",
    'How to create a "Dataset" of file metadata for preservation, ML, or sharing purposes'
)
    .addStep({
        targetId: Tutorial.FILE_LIST_ID,
        message:
            "You can generate CSV datasets containing a list of files' metadata. Start by selecting any number of rows in the file list.",
    })
    .addStep({
        targetId: Tutorial.FILE_LIST_ID,
        message:
            'Right-click any of the highlighted files and select "Save metadata as...", and choose your preferred file type. This will open a modal that will guide you through creating and downloading a CSV, parquet, or JSON file containing a list of the selected files and annotations associated with those files.',
    })
    .addStep({
        targetId: Tutorial.SAVE_BUTTON_ID,
        message:
            'You can also save the entire query result by clicking the "Save" icon. This also opens the modal for creating and downloading your metadata file.',
    });
