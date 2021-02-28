import * as React from "react";
import { useDispatch } from "react-redux";

import AnnotationFilter from "../AnnotationSidebar/AnnotationFilter";
import { DnDItemRendererParams } from "../../components/DnDList/DnDList";
import SvgIcon from "../../components/SvgIcon";
import { REMOVE_ICON_PATH_DATA } from "../../icons";
import { selection } from "../../state";

const styles = require("./HierarchyListItem.module.css");

const MARGIN_STEP = 10; // in px

/**
 * A single, draggable/droppable annotation that affects how files are organized in the FileList (i.e., how they are filtered, grouped, and sorted).
 */
export default function HierarchyListItem(props: DnDItemRendererParams) {
    const {
        index,
        item: { id, title },
    } = props;
    const dispatch = useDispatch();

    return (
        <div className={styles.container} style={{ marginLeft: MARGIN_STEP * index }}>
            <abbr className={styles.title} title={title}>
                {title}
            </abbr>
            <AnnotationFilter annotationName={id} />
            <SvgIcon
                height={15}
                onClick={() => {
                    dispatch(selection.actions.removeFromAnnotationHierarchy(id));
                }}
                pathData={REMOVE_ICON_PATH_DATA}
                viewBox="0 0 20 20"
                width={15}
            />
        </div>
    );
}
