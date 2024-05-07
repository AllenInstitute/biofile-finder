import * as React from "react";
import { useSelector } from "react-redux";

import ListPicker from "../ListPicker";
import { ListItem } from "../ListPicker/ListRow";
import { TOP_LEVEL_FILE_ANNOTATION_NAMES } from "../../constants";
import Annotation from "../../entity/Annotation";
import { metadata, selection } from "../../state";

interface Props {
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
    const annotations = useSelector(metadata.selectors.getSortedAnnotations);
    const unavailableAnnotations = useSelector(
        selection.selectors.getUnavailableAnnotationsForHierarchy
    );
    const areAvailableAnnotationLoading = useSelector(
        selection.selectors.getAvailableAnnotationsForHierarchyLoading
    );

    const items = annotations
        .filter(
            (annotation) =>
                !props.disabledTopLevelAnnotations ||
                !TOP_LEVEL_FILE_ANNOTATION_NAMES.includes(annotation.name)
        )
        .map((annotation) => ({
            selected: props.selections.some((selected) => selected.name === annotation.name),
            disabled: unavailableAnnotations.some(
                (unavailable) => unavailable.name === annotation.name
            ),
            loading: areAvailableAnnotationLoading,
            description: annotation.description,
            data: annotation,
            value: annotation.name,
            displayValue: annotation.displayName,
        }));

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