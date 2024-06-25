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
}

/**
 * Form for selecting which annotations to use in some exterior context like
 * downloading a manifest.
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

    const isSelectable = (annotation: any): boolean =>
        !props.disabledTopLevelAnnotations ||
        !(annotation instanceof Annotation) ||
        !TOP_LEVEL_FILE_ANNOTATION_NAMES.includes(annotation.name);

    const recentAnnotations = recentAnnotationNames.flatMap((name) =>
        annotations.filter((annotation) => annotation.name === name && isSelectable(annotation))
    );

    // combine all annotation lists and buffer item objects
    const nonUniqueItems: ListItem<Annotation>[] = [
        ...recentAnnotations,
        ...(recentAnnotations.length ? [RECENT_ANNOTATIONS_DIVIDER] : []),
        ...annotations,
    ]
        .filter(isSelectable)
        .map((annotation) => {
            // This is reached if the 'annotation' is a spacer.
            if (!(annotation instanceof Annotation)) {
                return annotation;
            }

            const isSelected = props.selections.some((selected) => selected === annotation.name);
            return {
                selected: isSelected,
                recent: recentAnnotationNames.includes(annotation.name) && !isSelected,
                disabled:
                    !isSelected &&
                    props.disableUnavailableAnnotations &&
                    unavailableAnnotations.some(
                        (unavailable) => unavailable.name === annotation.name
                    ),
                loading: props.disableUnavailableAnnotations && areAvailableAnnotationLoading,
                description: annotation.description,
                data: annotation,
                value: annotation.name,
                displayValue: annotation.displayName,
            };
        });

    const items = uniqBy(nonUniqueItems, "value");

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
            subMenuRenderer={props.annotationSubMenuRenderer}
        />
    );
}
