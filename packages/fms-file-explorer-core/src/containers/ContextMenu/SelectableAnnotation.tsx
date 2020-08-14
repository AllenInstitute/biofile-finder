import { some } from "lodash";
import { Icon } from "office-ui-fabric-react";
import * as React from "react";
import { useSelector, useDispatch } from "react-redux";

import Annotation from "../../entity/Annotation";
import { selection } from "../../state";

const styles = require("./SelectableAnnotation.module.css");

interface SelectableAnnotationProps {
    annotation: Annotation;
}

/**
 * Component used for selecting and deselecting annotations as columns in the FileList.
 */
export default function SelectableAnnotation({ annotation }: SelectableAnnotationProps) {
    const dispatch = useDispatch();
    const columnAnnotations = useSelector(selection.selectors.getOrderedDisplayAnnotations);
    const alreadySelected = some(columnAnnotations, (ca) => annotation.name === ca.name);

    const onClick = (evt: React.MouseEvent) => {
        // Prevent context menu from closing
        evt.preventDefault();
        // If the annotation is already present as a column, deselect it
        if (alreadySelected) {
            dispatch(selection.actions.deselectDisplayAnnotation(annotation));
        } else {
            dispatch(selection.actions.selectDisplayAnnotation(annotation));
        }
    };

    return (
        <div className={styles.container} onClick={onClick}>
            <div className={styles.icon}>{alreadySelected && <Icon iconName="checkmark" />}</div>
            {annotation.displayName}
        </div>
    );
}
