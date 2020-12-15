import * as React from "react";
import { useSelector, useDispatch } from "react-redux";

import Annotation from "../../entity/Annotation";
import ListPicker, { ListItem } from "../../components/ListPicker";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../constants";
import { metadata, selection } from "../../state";

/**
 * Custom UI rendered by the ContextMenu to select which annotations to use as columns
 * in the FileList. See the `onContextMenu` handler passed to each `FileRow` in `Header`.
 */
export default function FileListColumnPicker() {
    const dispatch = useDispatch();

    const sortedAnnotations = useSelector(metadata.selectors.getSortedAnnotations);
    const allAnnotations = Annotation.sort([...TOP_LEVEL_FILE_ANNOTATIONS, ...sortedAnnotations]);

    const columnAnnotations = useSelector(selection.selectors.getOrderedDisplayAnnotations);
    const selections = new Set(columnAnnotations.map((annot) => annot.name));

    const items: ListItem[] = allAnnotations.map((annot) => ({
        checked: selections.has(annot.name),
        displayValue: annot.displayName,
        value: annot.name,
    }));

    const onSelect = (item: ListItem) => {
        const annotation = allAnnotations.find((annot) => annot.name === item.value);
        if (annotation) {
            dispatch(selection.actions.selectDisplayAnnotation(annotation));
        }
    };

    const onDeselect = (item: ListItem) => {
        const annotation = allAnnotations.find((annot) => annot.name === item.value);
        if (annotation) {
            dispatch(selection.actions.deselectDisplayAnnotation(annotation));
        }
    };

    return <ListPicker items={items} onDeselect={onDeselect} onSelect={onSelect} />;
}
