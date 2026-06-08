import * as React from "react";
import { isEqual, uniqBy } from "lodash";
import { useSelector } from "react-redux";

import ListPicker from "../ListPicker";
import { ListItem } from "../ListPicker/ListRow";
import { TOP_LEVEL_FILE_ANNOTATION_NAMES } from "../../constants";
import Annotation from "../../entity/Annotation";
import { metadata, selection } from "../../state";

// Define buffer item
const DIVIDER_SENTINAL_VALUE = "_BUFFER_BAR_ID_";
const RECENT_ANNOTATIONS_DIVIDER: ListItem<Annotation> = {
    selected: false,
    disabled: false,
    isDivider: true,
    value: DIVIDER_SENTINAL_VALUE,
    displayValue: "",
};

interface Props {
    id?: string;
    disabledTopLevelAnnotations?: boolean;
    hasSelectAllCapability?: boolean;
    disableUnavailableAnnotations?: boolean;
    className?: string;
    title?: string;
    selections: string[][];
    annotationSubMenuRenderer?: (
        item: ListItem<Annotation>
    ) => React.ReactElement<ListItem<Annotation>>;
    setSelections: (annotations: string[][]) => void;
    shouldShowNullGroups?: boolean;
}

/**
 * Form for selecting which annotations to use in some exterior context like
 * downloading a manifest.
 *
 * Nested sub-field annotations (e.g. "Well.Gene", "Well.Dose.Unit") are listed under their
 * top-level parent, with each leaf showing its full ancestry as breadcrumbs (e.g.
 * "Well / Dose / Unit"). Leaves are grouped by root parent and ordered so that sub-fields
 * sharing an intermediate parent stay adjacent.
 */
export default function AnnotationPicker(props: Props) {
    const annotations = useSelector(metadata.selectors.getSortedAnnotations);
    const unavailableAnnotations = useSelector(
        selection.selectors.getUnavailableAnnotationsForHierarchy
    );
    const areAvailableAnnotationLoading = useSelector(
        selection.selectors.getAvailableAnnotationsForHierarchyLoading
    );
    const recentAnnotationNames = useSelector(selection.selectors.getRecentAnnotations);
    const annotationMatchesStoredKey = (annotation: Annotation, key: string) =>
        key === annotation.path.join(".") || key === annotation.name;
    const isRecentAnnotation = (annotation: Annotation) =>
        recentAnnotationNames.some((recent) => annotationMatchesStoredKey(annotation, recent));

    const isSelectable = (annotation: Annotation): boolean =>
        !props.disabledTopLevelAnnotations ||
        !TOP_LEVEL_FILE_ANNOTATION_NAMES.includes(annotation.name);

    const annotationToListItem = (annotation: Annotation): ListItem<Annotation> => {
        const annotationKey = annotation.path.join(".");
        const selected = props.selections.some((selectedPath) =>
            isEqual(selectedPath, annotation.path)
        );
        const disabled =
            !selected &&
            props.disableUnavailableAnnotations &&
            unavailableAnnotations.some((unavailable) =>
                isEqual(unavailable.path, annotation.path)
            );

        return {
            disabled,
            selected,
            data: annotation,
            value: annotationKey,
            displayValue: annotation.displayName,
            description: annotation.description,
            recent: isRecentAnnotation(annotation) && !selected,
            loading: props.disableUnavailableAnnotations && areAvailableAnnotationLoading,
            breadcrumbs: annotation.path.length > 1 ? annotation.path.slice(0, -1) : undefined,
        };
    };

    const nonUniqueItems = annotations
        // Annotations must be selectedable and not have nested children
        .filter((a) => isSelectable(a) && !a.isParent)
        // Sort recent annotations to the top then sort by alphabetically
        .sort((a, b) => {
            const aIsRecent = isRecentAnnotation(a);
            const bIsRecent = isRecentAnnotation(b);
            const isUsedMoreRecent = aIsRecent && !bIsRecent;
            const isUsedLessRecent = bIsRecent && !aIsRecent;
            if (isUsedMoreRecent) return -1;
            if (isUsedLessRecent) return 1;
            // If both annotations are recent or both are not recent, sort alphabetically
            return a.path.join(".").localeCompare(b.path.join("."));
        })
        .map(annotationToListItem);
    const items = uniqBy(nonUniqueItems, (item) => item.data?.path.join(".") ?? item.value);

    // If there are any recent annotations add a divider between them
    // and the rest of the annotations (assuming any left)
    if (recentAnnotationNames.length) {
        items.push(RECENT_ANNOTATIONS_DIVIDER);
    }

    const removeSelection = (item: ListItem<Annotation>) => {
        props.setSelections(props.selections.filter((path) => !isEqual(path, item.data?.path)));
    };

    const addSelection = (item: ListItem<Annotation>) => {
        // Should never be undefined, included as guard statement to satisfy compiler
        if (item.data) {
            props.setSelections([...props.selections, item.data.path]);
        }
    };

    return (
        <ListPicker
            className={props.className}
            id={props.id}
            items={items}
            title={props.title}
            onDeselect={removeSelection}
            onSelect={addSelection}
            onSelectAll={
                props.hasSelectAllCapability
                    ? () =>
                          props.setSelections?.(
                              annotations.filter((a) => !a.isParent).map((a) => a.path)
                          )
                    : undefined
            }
            onDeselectAll={() => props.setSelections([])}
            shouldShowNullGroups={props.shouldShowNullGroups}
            subMenuRenderer={props.annotationSubMenuRenderer}
        />
    );
}
