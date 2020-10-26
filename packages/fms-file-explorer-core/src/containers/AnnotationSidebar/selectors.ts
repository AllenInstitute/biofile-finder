import { map } from "lodash";
import { createSelector } from "reselect";

import { AnnotationListItemType } from "../AnnotationList/AnnotationListItem";
import { DnDItem } from "../../components/DnDList/DnDList";
import Annotation from "../../entity/Annotation";
import FileFilter from "../../entity/FileFilter";
import { metadata, selection } from "../../state";

export const getAnnotationListItems = createSelector(
    [
        metadata.selectors.getSortedAnnotations,
        selection.selectors.getAvailableAnnotationsForHierarchy,
        selection.selectors.getAnnotationHierarchy,
        selection.selectors.getFileFilters,
    ],
    (
        annotations: Annotation[],
        availableAnnotationNames: string[],
        hierarchy: Annotation[],
        filters: FileFilter[]
    ): AnnotationListItemType[] => {
        const disabledAnnotationNames = new Set([
            ...availableAnnotationNames,
            ...hierarchy.map((annotation) => annotation.name),
        ]);
        const filteredAnnotationNames = new Set(filters.map((filter) => filter.name));
        const disabledItems: AnnotationListItemType[] = [];
        const filteredItems: AnnotationListItemType[] = [];
        const items: AnnotationListItemType[] = [];
        annotations.forEach((annotation) => {
            const disabled = disabledAnnotationNames.has(annotation.name);
            const item = {
                disabled,
                description: annotation.description,
                filtered: filteredAnnotationNames.has(annotation.name),
                id: annotation.name,
                title: annotation.displayName,
            };
            if (filteredAnnotationNames.has(annotation.name)) {
                filteredItems.push(item);
            } else if (disabledAnnotationNames.has(annotation.name)) {
                disabledItems.push(item);
            } else {
                items.push(item);
            }
        });
        return [...filteredItems, ...items, ...disabledItems];
    }
);

export const getHierarchyListItems = createSelector(
    [selection.selectors.getAnnotationHierarchy],
    (annotations: Annotation[]): DnDItem[] => {
        return map(annotations, (annotation) => ({
            description: annotation.description,
            id: annotation.name,
            title: annotation.displayName,
        }));
    }
);
