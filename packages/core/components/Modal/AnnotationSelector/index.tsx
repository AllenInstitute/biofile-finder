import { DefaultButton } from "@fluentui/react";
import * as React from "react";
import { useSelector } from "react-redux";

import Annotation from "../../../entity/Annotation";
import ListPicker, { ListItem } from "../../ListPicker";
import { metadata } from "../../../state";

import styles from "./AnnotationSelector.module.css";

interface AnnotationSelectorProps {
    className?: string;
    disabled?: boolean;
    excludeFileAttributes?: boolean;
    selections: Annotation[];
    setSelections: (annotations: Annotation[]) => void;
}

/**
 * Form for selecting which annotations to use in some exterior context like
 * downloading a manifest.
 */
export default function AnnotationSelector(props: AnnotationSelectorProps) {
    const { className, selections, setSelections } = props;

    const sortedAnnotations = useSelector(metadata.selectors.getSortedAnnotations);
    const sortedAnnotationsWithFileAttributes = useSelector(
        metadata.selectors.getCustomAnnotationsCombinedWithFileAttributes
    );
    const annotations = props.excludeFileAttributes
        ? sortedAnnotations
        : sortedAnnotationsWithFileAttributes;
    const items = annotations.map((annotation) => ({
        selected: selections.includes(annotation),
        displayValue: annotation.displayName,
        value: annotation.name,
        data: annotation,
    }));

    const removeSelection = (item: ListItem<Annotation>) => {
        setSelections(selections.filter((annotation) => annotation !== item.data));
    };

    const addSelection = (item: ListItem<Annotation>) => {
        // an impossible condition, but include guard statement to satisfy compiler
        if (!item.data) {
            return;
        }

        setSelections(Annotation.sort([...selections, item.data]));
    };

    return (
        <div className={className}>
            {!props.disabled && (
                <div className={styles.buttonBar}>
                    <DefaultButton
                        disabled={annotations.length === selections.length}
                        onClick={() => setSelections(annotations)}
                        text="Select All"
                    />
                    <DefaultButton
                        disabled={!selections.length}
                        onClick={() => setSelections([])}
                        text="Select None"
                    />
                </div>
            )}
            <ListPicker
                disabled={props.disabled}
                items={items}
                onDeselect={removeSelection}
                onSelect={addSelection}
            />
        </div>
    );
}
