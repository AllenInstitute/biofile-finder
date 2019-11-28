import * as classNames from "classnames";
import { map } from "lodash";
import * as React from "react";
import { useDrop } from "react-dnd-cjs";
import { useDispatch, useSelector } from "react-redux";

import { selection } from "../../state";
import { ListItemData, ANNOTATION_DRAG_TYPE } from "../AnnotationList/ListItem";
import SvgIcon from "../../components/SvgIcon";
import HierarchyItem from "./HierarchyItem";

const styles = require("./HierarchyBuilder.module.css");

interface HierarchyBuilderProps {
    className?: string;
}

interface DragItemData {
    annotation: ListItemData;
    type: string;
}

// Designed Daniel Bruce (www.entypo.com)
// License: https://creativecommons.org/licenses/by-sa/4.0/
const REMOVE_ICON_PATH_DATA =
    "M14.348 14.849c-0.469 0.469-1.229 0.469-1.697 0l-2.651-3.030-2.651 3.029c-0.469 0.469-1.229 0.469-1.697 0-0.469-0.469-0.469-1.229 0-1.697l2.758-3.15-2.759-3.152c-0.469-0.469-0.469-1.228 0-1.697s1.228-0.469 1.697 0l2.652 3.031 2.651-3.031c0.469-0.469 1.228-0.469 1.697 0s0.469 1.229 0 1.697l-2.758 3.152 2.758 3.15c0.469 0.469 0.469 1.229 0 1.698z";

export default function HierarchyBuilder(props: HierarchyBuilderProps) {
    const { className } = props;
    const dispatch = useDispatch();
    const annotationHierarchy = useSelector(selection.selectors.getAnnotationHierarchy);

    const [{ canDrop }, dropRef] = useDrop({
        accept: ANNOTATION_DRAG_TYPE,
        drop: ({ annotation }: DragItemData, monitor) => {
            // add to end of list if dropped on the container
            if (monitor.isOver({ shallow: true })) {
                console.log("dropped from builder");
                dispatch(selection.actions.modifyAnnotationHierarchy(annotation.id));
            }
        },
        collect: (monitor) => ({
            canDrop: monitor.canDrop(),
        }),
    });

    return (
        <div className={classNames({ [styles.dropIndicator]: canDrop }, className)} ref={dropRef}>
            {map(annotationHierarchy, (annotation, index) => (
                <HierarchyItem key={annotation.name} annotation={annotation} index={index} />
            ))}
        </div>
    );
}
