import { Icon } from "@fluentui/react";
import classNames from "classnames";
import { map } from "lodash";
import * as React from "react";
import { useSelector, useDispatch } from "react-redux";

import useDragAndDropOrder from "./useDragAndDropOrder";
import useVisibleColumns from "./useVisibleCells";
import { ContextMenuItem } from "../ContextMenu";
import Tooltip from "../Tooltip";
import FileRow, { CellConfig } from "../../components/FileRow";
import { SortOrder } from "../../entity/FileSort";
import Tutorial from "../../entity/Tutorial";
import { interaction, metadata, selection } from "../../state";

import styles from "./Header.module.css";

/**
 * The FileList table header. Its cells are determined by the annotations the user has selected to display. It is rendered directly into the virtualized list within the FileList component
 * (as the `outerElementType` on `FixedSizeList`) and maintained at the top of the list using position:sticky. This is done because the scrollbar width in the `FixedSizeList`
 * (which affects its innerWidth) greatly complicates lining up the header cells with the data rendered into the virtualized list. The individual `LazilyRenderedRow`s rendered by
 * `FixedSizeList` are the `children` passed to this component. They are absolutely positioned by `react-window`, and wrapped in a relatively positioned container to keep them under the
 * header.
 */
function Header(
    { children, ...rest }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>,
    ref: React.Ref<HTMLDivElement>
) {
    const dispatch = useDispatch();
    const annotationNameToAnnotationMap = useSelector(
        metadata.selectors.getAnnotationNameToAnnotationMap
    );
    const { columns: visibleColumns, padding } = useVisibleColumns();
    const allColumnNames = useSelector(selection.selectors.getColumnNames);
    const sortColumn = useSelector(selection.selectors.getSortColumn);

    const onReorder = React.useCallback(
        (item: string, moveTo: number) => {
            dispatch(selection.actions.reorderColumns([{ name: item, moveTo }]));
        },
        [dispatch]
    );

    const {
        draggedItem,
        dragOverItem,
        onDragStart,
        onDragOver,
        onDrop,
        onDragEnd,
    } = useDragAndDropOrder(allColumnNames, onReorder);

    const onResize = (name: string, width?: number) => {
        dispatch(selection.actions.resizeColumn({ name, width }));
    };

    const onHeaderNameClick = (evt: React.MouseEvent, columnName: string) => {
        // Prevent this click from bubbling up to the header's onClick
        // which opens the column picker context menu
        evt.stopPropagation();
        dispatch(selection.actions.sortColumn(columnName));
    };

    const onHeaderColumnClick = (evt: React.MouseEvent, columnName: string) => {
        evt.preventDefault();
        const items: ContextMenuItem[] = [
            {
                key: "Move to start",
                text: "Move to start",
                title: "Move column to the start",
                onClick: () => {
                    dispatch(selection.actions.reorderColumns([{ name: columnName, moveTo: 0 }]));
                },
            },
            {
                key: "Move to end",
                text: "Move to end",
                title: "Move column to the end",
                onClick: () => {
                    dispatch(
                        selection.actions.reorderColumns([
                            { name: columnName, moveTo: allColumnNames.length - 1 },
                        ])
                    );
                },
            },
        ];
        dispatch(interaction.actions.showContextMenu(items, evt.nativeEvent));
    };

    const headerCells: CellConfig[] = map(visibleColumns, (column) => ({
        className: classNames(styles.headerCell, {
            [styles.dragOver]: dragOverItem === column.name && draggedItem !== column.name,
            [styles.dragging]: draggedItem === column.name,
        }),
        // needs to match the value used to produce `column`s passed to the `useResizableColumns` hook
        columnKey: column.name,
        displayValue: (
            <div
                draggable
                aria-label={`${
                    annotationNameToAnnotationMap[column.name]?.displayName
                } column, draggable`}
                className={styles.headerDragArea}
                role="button"
                tabIndex={0}
                onDragStart={() => onDragStart(column.name)}
                onDragOver={(e) => onDragOver(e, column.name)}
                onDrop={() => onDrop(column.name)}
                onDragEnd={onDragEnd}
                onClick={(evt) => onHeaderColumnClick(evt, column.name)}
                onContextMenu={(evt) => onHeaderColumnClick(evt, column.name)}
            >
                <div
                    onClick={(evt) => onHeaderNameClick(evt, column.name)}
                    className={styles.headerClickTarget}
                >
                    <span className={styles.headerTooltipWrapper}>
                        <Tooltip content={annotationNameToAnnotationMap[column.name]?.description}>
                            <span className={styles.headerTitle}>
                                {annotationNameToAnnotationMap[column.name]?.displayName}
                            </span>
                        </Tooltip>
                    </span>
                    {sortColumn?.annotationName === column.name &&
                        (sortColumn?.order === SortOrder.DESC ? (
                            <Icon className={styles.sortIcon} iconName="ChevronDown" />
                        ) : (
                            <Icon className={styles.sortIcon} iconName="ChevronUp" />
                        ))}
                </div>
            </div>
        ),
        width: column.width,
    }));

    return (
        <div ref={ref} {...rest}>
            <div className={styles.headerWrapper} id={Tutorial.COLUMN_HEADERS_ID}>
                <FileRow
                    cells={headerCells}
                    className={styles.header}
                    onResize={onResize}
                    padding={padding}
                />
            </div>
            <div className={styles.listParent}>{children}</div>
        </div>
    );
}

export default React.forwardRef<
    HTMLDivElement,
    React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>
>(Header);
