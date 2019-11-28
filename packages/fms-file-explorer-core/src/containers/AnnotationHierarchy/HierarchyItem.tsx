import * as classNames from "classnames";
import { map } from "lodash";
import * as React from "react";
import { useDrop } from "react-dnd-cjs";
import { useDispatch, useSelector } from "react-redux";

import { selection } from "../../state";
import { ListItemData, ANNOTATION_DRAG_TYPE } from "../AnnotationList/ListItem";
import SvgIcon from "../../components/SvgIcon";
import Annotation from "../../entity/Annotation";

const styles = require("./HierarchyBuilder.module.css");

interface HierarchyItemProps {
    annotation: Annotation;
    className?: string;
    index: number;
}

interface DragItemData {
    annotation: ListItemData;
    type: string;
}

// Designed Daniel Bruce (www.entypo.com)
// License: https://creativecommons.org/licenses/by-sa/4.0/
const REMOVE_ICON_PATH_DATA =
    "M14.348 14.849c-0.469 0.469-1.229 0.469-1.697 0l-2.651-3.030-2.651 3.029c-0.469 0.469-1.229 0.469-1.697 0-0.469-0.469-0.469-1.229 0-1.697l2.758-3.15-2.759-3.152c-0.469-0.469-0.469-1.228 0-1.697s1.228-0.469 1.697 0l2.652 3.031 2.651-3.031c0.469-0.469 1.228-0.469 1.697 0s0.469 1.229 0 1.697l-2.758 3.152 2.758 3.15c0.469 0.469 0.469 1.229 0 1.698z";

export default function HierarchyItem(props: HierarchyItemProps) {
    const { annotation, className, index } = props;
    const ref = React.useRef(null);
    const dispatch = useDispatch();

    const [, drop] = useDrop({
        accept: ANNOTATION_DRAG_TYPE,
        drop: ({ annotation }: DragItemData) => {
            dispatch(selection.actions.modifyAnnotationHierarchy(annotation.id));
        },
        hover(item, monitor) {
            if (!ref.current) {
                return;
            }
            const hoverIndex = index;

            // Determine rectangle on screen
            const hoverBoundingRect = ref.current.getBoundingClientRect();
            // Get vertical middle
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            // Determine mouse position
            const clientOffset = monitor.getClientOffset();
            // Get pixels to the top
            const hoverClientY = clientOffset.y - hoverBoundingRect.top;
            // Only perform the move when the mouse has crossed half of the items height
            // When dragging downwards, only move when the cursor is below 50%
            // When dragging upwards, only move when the cursor is above 50%
            // Dragging downwards
            if (hoverClientY < hoverMiddleY) {
                return;
            }
            // Dragging upwards
            if (hoverClientY > hoverMiddleY) {
                return;
            }

            // Time to actually perform the action
            // moveCard(dragIndex, hoverIndex)

            // Note: we're mutating the monitor item here!
            // Generally it's better to avoid mutations,
            // but it's good here for the sake of performance
            // to avoid expensive index searches.
            item.index = hoverIndex;
        },
    });

    drop(ref);

    return (
        <div className={styles.row} key={annotation.name} ref={ref}>
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
}
