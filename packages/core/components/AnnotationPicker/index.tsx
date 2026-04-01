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
 * Build a visually nested list of items for the sub-fields of a parent nested annotation.
 * Intermediate path segments that are not themselves selectable annotations are emitted as
 * non-interactive group-header items so the path hierarchy is clear in the UI.
 *
 * Example – parent "Well", sub-fields ["Well.Gene", "Well.Solution.Name", "Well.Solution.Dose"]:
 *   { displayValue: "Gene",      depth: 1, isGroupHeader: false }
 *   { displayValue: "Solution",  depth: 1, isGroupHeader: true  }  ← non-selectable label
 *   { displayValue: "Name",      depth: 2, isGroupHeader: false }
 *   { displayValue: "Dose",      depth: 2, isGroupHeader: false }
 */
function buildSubFieldItems(
    parentName: string,
    subFields: Annotation[],
    annotationToListItem: (a: Annotation) => ListItem<Annotation>
): ListItem<Annotation>[] {
    type Node = { annotation?: Annotation; children: Map<string, Node> };
    const root = new Map<string, Node>();

    for (const sf of subFields) {
        const relative = sf.name.startsWith(parentName + ".")
            ? sf.name.slice(parentName.length + 1)
            : sf.name;
        const parts = relative.split(".");
        let level = root;
        for (let i = 0; i < parts.length; i++) {
            if (!level.has(parts[i])) level.set(parts[i], { children: new Map() });
            const node = level.get(parts[i])!;
            if (i === parts.length - 1) node.annotation = sf;
            level = node.children;
        }
    }

    function flatten(
        prefix: string,
        nodeMap: Map<string, Node>,
        depth: number
    ): ListItem<Annotation>[] {
        const result: ListItem<Annotation>[] = [];
        for (const [label, node] of nodeMap) {
            if (node.children.size === 0) {
                // Pure leaf — a real, selectable annotation
                result.push({
                    ...annotationToListItem(node.annotation!),
                    displayValue: label,
                    depth,
                });
            } else {
                // Intermediate node
                if (node.annotation) {
                    // Selectable AND has children (unusual but handle)
                    result.push({
                        ...annotationToListItem(node.annotation),
                        displayValue: label,
                        depth,
                    });
                } else {
                    // Non-selectable group label
                    result.push({
                        value: `__header__${prefix}.${label}`,
                        displayValue: label,
                        selected: false,
                        disabled: false,
                        isGroupHeader: true,
                        depth,
                        data: undefined,
                    });
                }
                result.push(...flatten(`${prefix}.${label}`, node.children, depth + 1));
            }
        }
        return result;
    }

    return flatten(parentName, root, 1);
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
        const selected = props.selections.some((s) => s === annotation.name);
        const disabled =
            !selected &&
            props.disableUnavailableAnnotations &&
            unavailableAnnotations.some((u) => u.name === annotation.name);
        return {
            disabled,
            selected,
            data: annotation,
            value: annotation.name,
            description: annotation.description,
            displayValue: annotation.displayName,
            recent: recentAnnotationNames.includes(annotation.name) && !selected,
            loading: props.disableUnavailableAnnotations && areAvailableAnnotationLoading,
        };
    };

    // Separate top-level annotations from sub-field annotations.
    // Sub-fields are identified by isNestedSubField flag or by dot in the name.
    const isSubField = (a: Annotation) => a.isNestedSubField || a.name.includes(".");

    const topLevelAnnotations = annotations.filter((a) => !isSubField(a));

    // Group sub-fields by their top-level parent name.
    const subFieldsByParent = new Map<string, Annotation[]>();
    annotations
        .filter((a) => isSubField(a) && isSelectable(a))
        .forEach((a) => {
            const parent = a.isNestedSubField
                ? a.nestedParent ?? a.name.slice(0, a.name.indexOf("."))
                : a.name.slice(0, a.name.indexOf("."));
            if (!parent) return;
            if (!subFieldsByParent.has(parent)) subFieldsByParent.set(parent, []);
            subFieldsByParent.get(parent)!.push(a);
        });

    // Build the hierarchical flat list: top-level annotation then its nested sub-tree.
    const hierarchicalItems: ListItem<Annotation>[] = [];
    for (const ann of topLevelAnnotations) {
        if (!isSelectable(ann)) continue;
        const hasSubFields = subFieldsByParent.has(ann.name);
        if (hasSubFields && ann.isNested) {
            // Parent nested annotation (e.g. "Well"): show as a non-interactive group header.
            // Selecting the raw JSON column directly is not meaningful for group-by or filtering;
            // users should pick one of the sub-fields below it instead.
            hierarchicalItems.push({
                value: `__header__${ann.name}`,
                displayValue: ann.displayName,
                selected: false,
                disabled: false,
                isGroupHeader: true,
                depth: 0,
                data: undefined,
            });
        } else {
            hierarchicalItems.push(annotationToListItem(ann));
        }
        if (hasSubFields) {
            hierarchicalItems.push(
                ...buildSubFieldItems(
                    ann.name,
                    subFieldsByParent.get(ann.name)!,
                    annotationToListItem
                )
            );
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
