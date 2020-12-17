import * as React from "react";
import { useSelector, useDispatch } from "react-redux";

import ListPicker, { ListItem } from "../../components/ListPicker";
import { metadata, selection } from "../../state";

/**
 * Custom UI rendered by the ContextMenu to select which annotations to use as columns
 * in the FileList. See the `onContextMenu` handler passed to each `FileRow` in `Header`.
 */
export default function FileListColumnPicker() {
    const dispatch = useDispatch();

    const allAnnotations = useSelector(
        metadata.selectors.getCustomAnnotationsCombinedWithFileAttributes
    );

    const columnAnnotations = useSelector(selection.selectors.getOrderedDisplayAnnotations);
    const selections = new Set(columnAnnotations.map((annot) => annot.name));

    const items: ListItem[] = allAnnotations.map((annotation) => ({
        selected: selections.has(annotation.name),
        displayValue: annotation.displayName,
        value: annotation.name,
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
