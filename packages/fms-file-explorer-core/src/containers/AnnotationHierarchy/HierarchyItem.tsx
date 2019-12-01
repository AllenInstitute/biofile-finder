import * as classNames from "classnames";
import { map } from "lodash";
import * as React from "react";
import {
    DraggableProvidedDraggableProps,
    DraggableProvidedDragHandleProps,
} from "react-beautiful-dnd";
import { useDispatch } from "react-redux";

import { selection } from "../../state";
import { ListItemData, ANNOTATION_DRAG_TYPE } from "../AnnotationList/ListItem";
import SvgIcon from "../../components/SvgIcon";
import Annotation from "../../entity/Annotation";

const styles = require("./HierarchyBuilder.module.css");

interface HierarchyItemProps {
    annotation: Annotation;
    className?: string;
    draggableProps?: DraggableProvidedDraggableProps;
    dragHandleProps?: DraggableProvidedDragHandleProps | null;
}

interface DragItemData {
    annotation: ListItemData;
    type: string;
}

// Designed Daniel Bruce (www.entypo.com)
// License: https://creativecommons.org/licenses/by-sa/4.0/
const REMOVE_ICON_PATH_DATA =
    "M14.348 14.849c-0.469 0.469-1.229 0.469-1.697 0l-2.651-3.030-2.651 3.029c-0.469 0.469-1.229 0.469-1.697 0-0.469-0.469-0.469-1.229 0-1.697l2.758-3.15-2.759-3.152c-0.469-0.469-0.469-1.228 0-1.697s1.228-0.469 1.697 0l2.652 3.031 2.651-3.031c0.469-0.469 1.228-0.469 1.697 0s0.469 1.229 0 1.697l-2.758 3.152 2.758 3.15c0.469 0.469 0.469 1.229 0 1.698z";

const HierarchyItem = React.forwardRef<HTMLDivElement, HierarchyItemProps>(function HierarchyItem(
    props,
    ref
) {
    const { annotation, className, draggableProps, dragHandleProps } = props;
    const dispatch = useDispatch();

    return (
        <div
            className={styles.row}
            key={annotation.name}
            ref={ref}
            {...(draggableProps || {})}
            {...(dragHandleProps || {})}
        >
            <SvgIcon
                height={12}
                onClick={() => {
                    dispatch(selection.actions.modifyAnnotationHierarchy(annotation.name));
                }}
                pathData={REMOVE_ICON_PATH_DATA}
                viewBox="0 0 20 20"
                width={12}
            />
            {annotation.displayName}
        </div>
    );
});

export default HierarchyItem;
