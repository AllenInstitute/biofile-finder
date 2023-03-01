import Tutorial from "../../../entity/Tutorial";

export const GENERATE_MANIFEST_TUTORIAL = new Tutorial("Generating manifests")
    .addStep({
        targetId: Tutorial.FILE_LIST_ID,
        message:
            "Select a file by left-clicking or multiple by holding Shift or Ctrl and clicking multiple files (any will do for this tutorial)",
    })
    .addStep({
        targetId: Tutorial.FILE_LIST_ID,
        message:
            'Right-click any of the highlighted files and select "Generate CSV manifest". This will open a modal in which you will be guided through creating a CSV that is a list of the files selected where the columns are the annotations present for those files.',
    });
