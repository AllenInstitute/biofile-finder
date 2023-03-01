import { Icon } from "@fluentui/react";
import * as React from "react";

import Tutorial from "../../../entity/Tutorial";

export const FILTER_FILES_TUTORIAL = new Tutorial("Filtering")
    .addStep({
        targetId: Tutorial.ANNOTATION_LIST_ID,
        message: (
            <span>
                Filters for <strong>annotations</strong> can be found and used by clicking the{" "}
                <Icon iconName="FilterSolid" /> icon for the annotation to filter by and selecting
                which annotation values the files must have
            </span>
        ),
    })
    .addStep({
        targetId: Tutorial.FILE_ATTRIBUTE_FILTER_ID,
        message:
            "Files can also be filtered by these attributes by selecting one from the dropdown menu (ex. 'Uploaded') " +
            'and entering a value. The value for attributes like "File "name" do not have to be exact and can instead be ' +
            'partial matches (ex. entering "AD0000057" would show file "AD00000573_100x_20220729_H01_001_Scene-44_aligned.ome.tiff")',
    })
    .addStep({
        targetId: Tutorial.VIEWS_TITLE_ID,
        message:
            'Views can be useful to quickly apply a set of filters and sorts. Currently there are only "Views" surrounding the "Uploaded" attribute, but there could be more in the future.',
    });
