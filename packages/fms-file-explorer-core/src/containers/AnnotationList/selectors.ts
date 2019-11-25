import { map } from "lodash";
import { createSelector } from "reselect";

import { ListItemData } from "./ListItem";
import Annotation from "../../entity/Annotation";
import { metadata } from "../../state";

export const getAnnotationListItems = createSelector(
    [metadata.selectors.getAnnotations],
    (annotations: Annotation[]): ListItemData[] => {
        return map(annotations, (annotation) => ({
            id: annotation.name,
            description: annotation.description,
            title: annotation.displayName,
        }));
    }
);
