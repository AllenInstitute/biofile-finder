import * as React from "react";
import { uniqBy } from "lodash";
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
 * Nested sub-field annotations (e.g. "Well.Gene", "Well.Solution.Name") are shown
 * hierarchically underneath their parent using visual indentation.  Intermediate path
 * segments that are not themselves selectable (e.g. "Solution" in "Well.Solution.Name")
 * appear as non-interactive group-header labels.
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

    const recentAnnotations = recentAnnotationNames
        .map((name) => annotations.find((annotation) => annotation.name === name))
        .filter((annotation) => !!annotation) as Annotation[];

    const isSelectable = (annotation: Annotation): boolean =>
        !props.disabledTopLevelAnnotations ||
        !TOP_LEVEL_FILE_ANNOTATION_NAMES.includes(annotation.name);

    const annotationToListItem = (annotation: Annotation): ListItem<Annotation> => {
        const selected = props.selections.some((selected) => selected === annotation.path);
        const disabled =
            !selected &&
            props.disableUnavailableAnnotations &&
            unavailableAnnotations.some((unavailable) => unavailable.name === annotation.name);
        const value = annotation.name;
        const breadcrumbs = annotation.path.length > 1 ? annotation.path.slice(0, -1) : undefined;

        return {
            disabled,
            selected,
            value,
            breadcrumbs,
            data: annotation,
            description: breadcrumbs
                ? `${breadcrumbs.join(" / ")} / ${value}: ${annotation.description}`
                : annotation.description,
            recent: recentAnnotationNames.includes(annotation.name) && !selected,
            loading: props.disableUnavailableAnnotations && areAvailableAnnotationLoading,
        };
    };

    // Separate top-level annotations from sub-field annotations.
    const topLevelAnnotations = annotations.filter((a) => !a.isSubField);

    // Group sub-fields by their top-level parent name.
    const subFieldsByParent = new Map<string, Annotation[]>();
    annotations
        .filter((a) => a.isSubField && isSelectable(a))
        .forEach((a) => {
            const parent = a.path.length > 1
                ? a.path[0] // TODO: Needs to work for multiple layers of nested
                : undefined;
            if (!parent) return;
            if (!subFieldsByParent.has(parent)) subFieldsByParent.set(parent, []);
            subFieldsByParent.get(parent)!.push(a);
        });

    // Build the hierarchical flat list: top-level annotation then its nested sub-tree.
    const hierarchicalItems: ListItem<Annotation>[] = [];
    for (const ann of topLevelAnnotations) {
        if (!isSelectable(ann)) continue;

        const subFields = subFieldsByParent.get(ann.name);
        if (subFields) {
            // Only show the leaf sub-fields; skip the nested parent itself
            hierarchicalItems.push(...subFields.map(annotationToListItem));
        } else if (!ann.isParent) {
            hierarchicalItems.push(annotationToListItem(ann));
        }
    }

    // Recent annotations stay at the top at depth 0 with their full display name.
    const recentItems = recentAnnotations.filter(isSelectable).map((a) => annotationToListItem(a));

    const items = uniqBy([...recentItems, ...hierarchicalItems], "value");

    if (recentAnnotations.length) {
        items.push(RECENT_ANNOTATIONS_DIVIDER);
    }

    const removeSelection = (item: ListItem<Annotation>) => {
        props.setSelections(
            props.selections.filter((annotation) => annotation !== item.data?.path)
        );
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
                    ? () => props.setSelections?.(annotations.map((a) => a.path))
                    : undefined
            }
            onDeselectAll={() => props.setSelections([])}
            shouldShowNullGroups={props.shouldShowNullGroups}
            subMenuRenderer={props.annotationSubMenuRenderer}
        />
    );
}
