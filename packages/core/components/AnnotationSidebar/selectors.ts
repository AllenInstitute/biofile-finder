import { map } from "lodash";
import { createSelector } from "reselect";

import { AnnotationListDnDItem } from "../AnnotationList/AnnotationListItem";
import { DnDItem } from "../../components/DnDList/DnDList";
import Annotation from "../../entity/Annotation";
import FileFilter from "../../entity/FileFilter";
import { metadata, selection } from "../../state";
import { TOP_LEVEL_FILE_ANNOTATION_NAMES } from "../../constants";

export const getAnnotationListItems = createSelector(
    [
        metadata.selectors.getSupportedAnnotations,
        selection.selectors.getAvailableAnnotationsForHierarchy,
        selection.selectors.getAnnotationHierarchy,
        selection.selectors.getFileFilters,
    ],
    (
        annotations: Annotation[],
        availableAnnotationNames: string[],
        hierarchy: Annotation[],
        filters: FileFilter[]
    ): AnnotationListDnDItem[] => {
        const disabledAnnotations = hierarchy.length
            ? annotations.filter(
                  (annotation) => !availableAnnotationNames.includes(annotation.name)
              )
            : [];
        const disabledAnnotationNames = new Set(
            disabledAnnotations.map((annotation) => annotation.name)
        );
        const filteredAnnotationNames = new Set(filters.map((filter) => filter.name));
        return (
            annotations
                .map((annotation) => ({
                    description: annotation.description,
                    disabled: disabledAnnotationNames.has(annotation.name),
                    filtered: filteredAnnotationNames.has(annotation.name),
                    id: annotation.name,
                    title: annotation.displayName,
                    type: annotation.type,
                    isFileProperty: TOP_LEVEL_FILE_ANNOTATION_NAMES.includes(annotation.name),
                }))
                // Sort the filtered annotations to the top
                .sort((a, b) => (a.filtered && !b.filtered ? -1 : 1))
        );
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
