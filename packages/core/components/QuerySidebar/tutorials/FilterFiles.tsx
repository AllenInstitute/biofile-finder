import { Icon } from "@fluentui/react";
import * as React from "react";

import Tutorial from "../../../entity/Tutorial";

export const FILTER_FILES_TUTORIAL = new Tutorial("Filtering")
    .addStep({
        targetId: Tutorial.FILTER_HEADER_ID,
        message: (
            <span>
                Filter for specific annotation values by clicking the{" "}
                <Icon iconName="FilterSolid" /> icon next to the annotation you want to filter by.
            </span>
        ),
    })
    .addStep({
        targetId: Tutorial.FILE_ATTRIBUTE_FILTER_ID,
        message: "All metadata tags present in the data sources are listed in this dropdown.",
    })
    .addStep({
        targetId: Tutorial.FILE_ATTRIBUTE_FILTER_ID,
        message:
            'You can filter on the selected metadata tag by entering a value here. These values do not have to be exact, e.g. entering a File Name of "ZSD1" would return all files with names starting with or containing "ZSD1".',
    });
