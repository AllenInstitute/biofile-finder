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

    const annotations = useSelector(
        metadata.selectors.getCustomAnnotationsCombinedWithFileAttributes
    );
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
            <ListPicker items={items} onDeselect={removeSelection} onSelect={addSelection} />
        </div>
    );
}
