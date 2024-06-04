import * as React from "react";
import { uniqBy } from "lodash";
import { useSelector } from "react-redux";

import ListPicker from "../ListPicker";
import { ListItem } from "../ListPicker/ListRow";
import { TOP_LEVEL_FILE_ANNOTATION_NAMES } from "../../constants";
import Annotation from "../../entity/Annotation";
import { metadata, selection } from "../../state";

interface Props {
    id?: string;
    enableAllAnnotations?: boolean;
    disabledTopLevelAnnotations?: boolean;
    hasSelectAllCapability?: boolean;
    disableUnavailableAnnotations?: boolean;
    className?: string;
    title?: string;
    selections: Annotation[];
    annotationSubMenuRenderer?: (
        item: ListItem<Annotation>
    ) => React.ReactElement<ListItem<Annotation>>;
    setSelections: (annotations: Annotation[]) => void;
}

/**
 * Form for selecting which annotations to use in some exterior context like
 * downloading a manifest.
 */
export default function AnnotationPicker(props: Props) {
    const annotations = useSelector(metadata.selectors.getSortedAnnotations).filter(
        (annotation) =>
            !props.disabledTopLevelAnnotations ||
            !TOP_LEVEL_FILE_ANNOTATION_NAMES.includes(annotation.name)
    );
    const unavailableAnnotations = useSelector(
        selection.selectors.getUnavailableAnnotationsForHierarchy
    );
    const areAvailableAnnotationLoading = useSelector(
        selection.selectors.getAvailableAnnotationsForHierarchyLoading
    );

    const recentAnnotationNames = useSelector(selection.selectors.getRecentAnnotations);
    const recentAnnotations = recentAnnotationNames.flatMap((name) =>
        annotations.filter((annotation) => annotation.name === name)
    );

    // Define buffer item
    const bufferBar = {
        selected: false,
        disabled: false,
        isBuffer: true,
        value: "recent buffer",
        displayValue: "",
    };

    // combine all annotation lists and buffer item objects
    const rawItems = [...recentAnnotations, bufferBar, ...annotations];

    const items = uniqBy(
        rawItems.flatMap((annotation) => {
            if (annotation instanceof Annotation) {
                return {
                    selected: props.selections.some(
                        (selected) => selected.name === annotation.name
                    ),
                    disabled:
                        !props.enableAllAnnotations &&
                        unavailableAnnotations.some(
                            (unavailable) => unavailable.name === annotation.name
                        ),
                    recent:
                        recentAnnotationNames.includes(annotation.name) &&
                        !props.selections.some((selected) => selected.name === annotation.name),
                    loading: !props.enableAllAnnotations && areAvailableAnnotationLoading,
                    description: annotation.description,
                    data: annotation,
                    value: annotation.name,
                    displayValue: annotation.displayName,
                };
            } else {
                // This is reached if the 'annotation' is a spacer.
                return annotation;
            }
        }),
        "value"
    );

    const removeSelection = (item: ListItem<Annotation>) => {
        props.setSelections(
            props.selections.filter((annotation) => annotation.name !== item.data?.name)
        );
    };

    const addSelection = (item: ListItem<Annotation>) => {
        // Should never be undefined, included as guard statement to satisfy compiler
        if (item.data) {
            props.setSelections([...props.selections, item.data]);
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
                props.hasSelectAllCapability ? () => props.setSelections?.(annotations) : undefined
            }
            onDeselectAll={() => props.setSelections([])}
            subMenuRenderer={props.annotationSubMenuRenderer}
        />
    );
}
