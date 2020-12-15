import { DefaultButton } from "@fluentui/react";
import * as React from "react";
import { useSelector } from "react-redux";

import Annotation from "../../../entity/Annotation";
import ListPicker, { ListItem } from "../../../components/ListPicker";
import { metadata } from "../../../state";

const styles = require("./AnnotationSelector.module.css");

interface AnnotationSelectorProps {
    className?: string;
    selections: Annotation[];
    setSelections: (annotations: Annotation[]) => void;
}

/**
 * Form for selecting which annotations to use in some exterior context like
 * downloading a manifest.
 */
export default function AnnotationSelector(props: AnnotationSelectorProps) {
    const { className, selections, setSelections } = props;

    const annotations = useSelector(metadata.selectors.getSortedAnnotations);

    const removeSelection = (item: ListItem) => {
        setSelections(selections.filter((annotation) => annotation.name !== item.value));
    };

    const addSelection = (item: ListItem) => {
        const selected = annotations.find((annotation) => annotation.name === item.value);

        // should be an impossible condition, but here to satisfy compiler
        if (!selected) {
            return;
        }

        setSelections(Annotation.sort([...selections, selected]));
    };

    return (
        <div className={className}>
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
            <ListPicker
                items={annotations.map((annotation) => ({
                    checked: selections.includes(annotation),
                    displayValue: annotation.displayName,
                    value: annotation.name,
                }))}
                onDeselect={removeSelection}
                onSelect={addSelection}
            />
        </div>
    );
}
