import * as React from "react";
import { useSelector } from "react-redux";

import ListPicker from "../ListPicker";
import { ListItem } from "../ListPicker/ListRow";
import { TOP_LEVEL_FILE_ANNOTATION_NAMES } from "../../constants";
import Annotation, { AnnotationName } from "../../entity/Annotation";
import { selection } from "../../state";
import { uniqBy } from "lodash";

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
    const annotations = useSelector(selection.selectors.getSortedAnnotations).filter(
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
    const recentAnnotatitonNames = useSelector(selection.selectors.getRecentAnnotations);
    const recentAnnotations = recentAnnotatitonNames.flatMap((name) =>
        annotations.filter((annotation) => annotation.name === name)
    );
    const fileNameAnnotation = annotations.filter(
        (annotation) =>
            annotation.name === AnnotationName.FILE_NAME || annotation.name === "File Name"
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
    const rawItems = [...fileNameAnnotation, ...recentAnnotations, bufferBar, ...annotations];

    const items = uniqBy(
        rawItems.flatMap((item) => {
            if (item instanceof Annotation) {
                return {
                    selected: props.selections.some((selected) => selected.name === item.name),
                    disabled: unavailableAnnotations.some(
                        (unavailable) => unavailable.name === item.name
                    ),
                    recent:
                        recentAnnotatitonNames.includes(item.name) &&
                        !props.selections.some((selected) => selected.name === item.name),
                    loading: areAvailableAnnotationLoading,
                    isBuffer: false,
                    description: item.description,
                    data: item,
                    value: item.name,
                    displayValue: item.displayName,
                };
            } else {
                return item;
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
