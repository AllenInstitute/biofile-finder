import * as React from "react";

import Tutorial from "../../../entity/Tutorial";

export const CREATE_COLLECTION_TUTORIAL = new Tutorial("Creating collections")
    .addStep({
        targetId: Tutorial.FILE_LIST_ID,
        message:
            'Select a file by left-clicking it. You may also select multiple files by holding "Shift" or "Ctrl."',
    })
    .addStep({
        targetId: Tutorial.FILE_LIST_ID,
        message:
            'Right-click any of the highlighted files and select "Share Collection". Then, choose a Configuration. For this tutorial, use the default. This will make the collection available for one day and allow the metadata to be updated (if any updates occur). In the future, select "Configure..." and explore the options available.',
    })
    .addStep({
        targetId: Tutorial.COLLECTIONS_TITLE_ID,
        message: (
            <span>
                Once the app reports that your collection has been created (as a status near the top
                of the app) it will be available here in this dropdown. Select the option that has
                your username + a timestamp of when you created it. If you used the default
                configuration it will be present here for one day and only available to you,{" "}
                <strong>unless</strong> you share it using the URL feature (see the &quot;Sharing
                current view&quot; tutorial for that)
            </span>
        ),
    })
    .addStep({
        targetId: Tutorial.FILE_LIST_ID,
        message:
            'The files available to search against are now limited to just those selected to be a part of your collection. To return back to the default of "AICS FMS" (i.e. all files in the current datastore) navigate to the Collection header again and select that option from the dropdown.',
    });
