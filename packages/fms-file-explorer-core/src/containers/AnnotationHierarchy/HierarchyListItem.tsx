import * as React from "react";
import { useDispatch } from "react-redux";

import AnnotationFilterForm from "../../components/AnnotationFilterForm";
import DragIndicator from "../../components/DragIndicator";
import SvgIcon from "../../components/SvgIcon";
import { interaction, selection } from "../../state";

interface HierarchyItemProps {
    item: {
        id: string;
        description: string;
        title: string;
    };
}

// Designed Daniel Bruce (www.entypo.com)
// License: https://creativecommons.org/licenses/by-sa/4.0/
const REMOVE_ICON_PATH_DATA =
    "M14.348 14.849c-0.469 0.469-1.229 0.469-1.697 0l-2.651-3.030-2.651 3.029c-0.469 0.469-1.229 0.469-1.697 0-0.469-0.469-0.469-1.229 0-1.697l2.758-3.15-2.759-3.152c-0.469-0.469-0.469-1.228 0-1.697s1.228-0.469 1.697 0l2.652 3.031 2.651-3.031c0.469-0.469 1.228-0.469 1.697 0s0.469 1.229 0 1.697l-2.758 3.152 2.758 3.15c0.469 0.469 0.469 1.229 0 1.698z";

/**
 * A single, draggable/droppable annotation that affects how files are organized in the FileList (i.e., how they are filtered, grouped, and sorted).
 */
export default function HierarchyListItem(props: HierarchyItemProps) {
    const {
        item: { id, title },
    } = props;
    const dispatch = useDispatch();

    const onContextMenu = (evt: React.MouseEvent) => {
        const items = [
            {
                key: "filter",
                text: "Filters",
                subMenuProps: {
                    items: [
                        {
                            key: "filters",
                            onRender: function Filters() {
                                return <AnnotationFilterForm annotationName={id} />;
                            },
                        },
                    ],
                },
            },
        ];
        dispatch(interaction.actions.showContextMenu(items, evt.nativeEvent));
    };

    return (
        <div onContextMenu={onContextMenu}>
            <DragIndicator />
            <SvgIcon
                height={12}
                onClick={() => {
                    dispatch(selection.actions.removeFromAnnotationHierarchy(id));
                }}
                pathData={REMOVE_ICON_PATH_DATA}
                viewBox="0 0 20 20"
                width={12}
            />
            {title}
        </div>
    );
}
