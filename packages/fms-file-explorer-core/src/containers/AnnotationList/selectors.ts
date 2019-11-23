import { map } from "lodash";
import { createSelector } from "reselect";

import { ListItemProps } from "../../components/List/ListItem";
import Annotation from "../../entity/Annotation";
import { metadata } from "../../state";

export const getAnnotationListItems = createSelector(
    [metadata.selectors.getAnnotations],
    (annotations: Annotation[]): ListItemProps[] => {
        return map(annotations, (annotation) => ({
            id: annotation.name,
            value: annotation.displayName,
        }));
    }
);
