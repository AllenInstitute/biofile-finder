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
    displayValue: "",
};

interface Props {
    id?: string;
    disabledTopLevelAnnotations?: boolean;
    hasSelectAllCapability?: boolean;
    disableUnavailableAnnotations?: boolean;
    className?: string;
    title?: string;
    selections: string[];
    annotationSubMenuRenderer?: (
        item: ListItem<Annotation>
    ) => React.ReactElement<ListItem<Annotation>>;
    setSelections: (annotations: string[]) => void;
    shouldShowNullGroups?: boolean;
}

/**
 * Separator string used in dotted annotation names to identify the parent annotation.
 * "Well.Gene" has parent "Well"; "Well.Dose.Value" has parent "Well".
 */
const NESTED_PATH_SEPARATOR = ".";

/**
 * Form for selecting which annotations to use in some exterior context like
 * downloading a manifest.
 *
 * Annotations whose names contain a dot (e.g. "Well.Gene", "Well.Dose.Value") are
 * sub-field projections of a parent STRUCT/JSON annotation.  They are sorted so they
 * appear immediately after their parent annotation and are shown with a visual indent
 * prefix ("└ Gene", "└ Dose.Value") to make the hierarchy clear.
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

    /**
     * Whether `name` is a dotted sub-field path (e.g. "Well.Gene").
     * Returns the parent portion ("Well") or undefined if it is a top-level annotation.
     */
    const getParentName = (name: string): string | undefined => {
        const dot = name.indexOf(NESTED_PATH_SEPARATOR);
        return dot !== -1 ? name.slice(0, dot) : undefined;
    };

    /**
     * Whether `annotation` is a nested sub-field (either a virtual JSON path or a
     * STRUCT-flattened column). Both have dotted names; virtual ones additionally
     * set `isNestedSubField`.  Fall back to dotted-name detection for STRUCT columns.
     */
    const isSubFieldAnnotation = (annotation: Annotation): boolean =>
        annotation.isNestedSubField || getParentName(annotation.name) !== undefined;

    /** Build the display label for a nested sub-field annotation. */
    const nestedDisplayValue = (annotation: Annotation): string => {
        // For virtual sub-field annotations derive the display path from the annotation name
        // (e.g. "Well.Gene" → "└ Gene", "Well.Dose.Value" → "└ Dose └ Value").
        if (annotation.isNestedSubField && annotation.nestedJsonPath) {
            const parent = annotation.nestedParent ?? getParentName(annotation.name);
            const subDisplay = parent
                ? annotation.name.slice(parent.length + 1)
                : annotation.displayName;
            return `└ ${subDisplay.split(".").join(" └ ")}`;
        }
        const parent = getParentName(annotation.name);
        if (!parent) return annotation.displayName;
        // STRUCT column — show everything after the first dot
        return `└ ${annotation.name.slice(parent.length + 1)}`;
    };

    const annotationToListItem = (annotation: Annotation): ListItem<Annotation> => {
        const selected = props.selections.some((s) => s === annotation.name);
        const disabled =
            !selected &&
            props.disableUnavailableAnnotations &&
            unavailableAnnotations.some((u) => u.name === annotation.name);
        const isSubField = isSubFieldAnnotation(annotation);
        return {
            disabled,
            selected,
            data: annotation,
            value: annotation.name,
            description: annotation.description,
            displayValue: isSubField ? nestedDisplayValue(annotation) : annotation.displayName,
            recent: recentAnnotationNames.includes(annotation.name) && !selected,
            loading: props.disableUnavailableAnnotations && areAvailableAnnotationLoading,
        };
    };

    /**
     * Sort annotations so that sub-field annotations appear immediately after their parent,
     * preserving the relative order of siblings.
     *
     * Works for both STRUCT-flattened columns ("Well.Gene" physical) and virtual JSON
     * sub-field annotations ("Well.Gene" virtual) because both use dotted names with the
     * same parent prefix.
     *
     * E.g. given [A, Well, B, Well.Gene, Well.Dose.Value]
     *   → [A, Well, Well.Gene, Well.Dose.Value, B]
     */
    const sortWithNestedGrouped = (list: Annotation[]): Annotation[] => {
        const topLevel: Annotation[] = [];
        const byParent: Map<string, Annotation[]> = new Map();

        for (const ann of list) {
            // Use nestedParent for virtual annotations; fall back to string parsing for STRUCT.
            const parent = ann.isNestedSubField
                ? ann.nestedParent
                : getParentName(ann.name);
            if (parent) {
                const siblings = byParent.get(parent) ?? [];
                siblings.push(ann);
                byParent.set(parent, siblings);
            } else {
                topLevel.push(ann);
            }
        }

        // Interleave: for each top-level annotation, insert its sub-fields right after it.
        return topLevel.flatMap((ann) => [ann, ...(byParent.get(ann.name) ?? [])]);
    };

    // Map recent annotations into a list of items for selection
    const nonUniqueItems = [...recentAnnotations, ...sortWithNestedGrouped(annotations)]
        .filter(isSelectable)
        .map(annotationToListItem);

    const items = uniqBy(nonUniqueItems, "value");

    // If there are any recent annotations add a divider between them
    // and the rest of the annotations (assuming any left)
    if (recentAnnotations.length) {
        items.push(RECENT_ANNOTATIONS_DIVIDER);
    }

    const removeSelection = (item: ListItem<Annotation>) => {
        props.setSelections(
            props.selections.filter((annotation) => annotation !== item.data?.name)
        );
    };

    const addSelection = (item: ListItem<Annotation>) => {
        // Should never be undefined, included as guard statement to satisfy compiler
        if (item.data) {
            props.setSelections([...props.selections, item.data.name]);
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
                    ? () => props.setSelections?.(annotations.map((a) => a.name))
                    : undefined
            }
            onDeselectAll={() => props.setSelections([])}
            shouldShowNullGroups={props.shouldShowNullGroups}
            subMenuRenderer={props.annotationSubMenuRenderer}
        />
    );
}

