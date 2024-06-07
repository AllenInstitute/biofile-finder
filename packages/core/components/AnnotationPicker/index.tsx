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

    const recentAnnotations = recentAnnotationNames.flatMap((name) =>
        annotations.filter((annotation) => annotation.name === name)
    );

    // Define buffer item
    const bufferBar = {
        name: "buffer",
        selected: false,
        disabled: false,
        isBuffer: true,
        value: "recent buffer",
        displayValue: "",
    };

    // combine all annotation lists and buffer item objects
    const nonUniqueItems = [...recentAnnotations, bufferBar, ...annotations]
        .filter(
            (annotation) =>
                !props.disabledTopLevelAnnotations ||
                !TOP_LEVEL_FILE_ANNOTATION_NAMES.includes(annotation.name)
        )
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
