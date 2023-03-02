import Tutorial from "../../../entity/Tutorial";

export const GENERATE_MANIFEST_TUTORIAL = new Tutorial("Generating manifests")
    .addStep({
        targetId: Tutorial.FILE_LIST_ID,
        message:
            "You can generate CSV manifests containing a list of FMS files' metadata. Start by selecting any number of files from the file list.",
    })
    .addStep({
        targetId: Tutorial.FILE_LIST_ID,
        message:
            'Right-click any of the highlighted files and select "Generate CSV manifest". This will open a modal in which you will be guided through creating a CSV that contains a list of the selected files where the columns are the annotations present for those files.',
    });
