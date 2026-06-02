import { Icon } from "@fluentui/react";
import classNames from "classnames";
import { map } from "lodash";
import * as React from "react";
import { useSelector, useDispatch } from "react-redux";

import ColumnPicker from "./ColumnPicker";
import useDragAndDropOrder from "./useDragAndDropOrder";
import { ContextMenuItem } from "../ContextMenu";
import Tooltip from "../Tooltip";
import FileRow, { CellConfig } from "../../components/FileRow";
import { SortOrder } from "../../entity/FileSort";
import Tutorial from "../../entity/Tutorial";
import { interaction, metadata, selection } from "../../state";
import { Column } from "../../state/selection/actions";

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
    const pathToAnnotationMap = useSelector(
        metadata.selectors.getAnnotationNameToAnnotationMap
    );
    const columns = useSelector(selection.selectors.getColumns);
    const columnNames = useSelector(selection.selectors.getColumnNames);
    const sortColumn = useSelector(selection.selectors.getSortColumn);

    const onReorder = React.useCallback(
        (newOrder: string[]) => {
            const reorderedColumns = newOrder.flatMap(
                (key) => columns.find((c) => c.name === key) || []
            );
            dispatch(selection.actions.setColumns(reorderedColumns));
        },
        [columns, dispatch]
    );

    const {
        draggedItem,
        dragOverItem,
        onDragStart,
        onDragOver,
        onDrop,
        onDragEnd,
    } = useDragAndDropOrder(columnNames, onReorder);

    const onResize = (key: string, width?: number) => {
        // Default to 0.25 if width is undefined
        // which resets the column width to the default
        dispatch(selection.actions.resizeColumn({ name: key, width: width || 0.25 }));
    };

    const onHeaderColumnClick = (evt: React.MouseEvent, column: Column) => {
        // Prevent this click from bubbling up to the header's onClick
        // which opens the column picker context menu
        evt.stopPropagation();
        dispatch(selection.actions.sortColumn(column.name));
    };

    // Identify leaf names that appear on more than one column so we can
    // show the parent path prefix to disambiguate them in the header.
    const duplicateLeafNames = React.useMemo(() => {
        const leafCounts = new Map<string, number>();
        for (const colName of columnNames) {
            const parts = colName.split(".");
            const leaf = parts[parts.length - 1];
            leafCounts.set(leaf, (leafCounts.get(leaf) || 0) + 1);
        }
        const dupes = new Set<string>();
        for (const [leaf, count] of leafCounts) {
            if (count > 1) dupes.add(leaf);
        }
        return dupes;
    }, [columnNames]);

    const headerCells: CellConfig[] = map(columns, (column) => {
        return {
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
                        pathToAnnotationMap.get(column.name)?.displayName ?? column.name
                    } column, draggable`}
                    className={styles.headerDragArea}
                    role="button"
                    tabIndex={0}
                    onDragStart={() => onDragStart(column.name)}
                    onDragOver={(e) => onDragOver(e, column.name)}
                    onDrop={() => onDrop(column.name)}
                    onDragEnd={onDragEnd}
                >
                    <div
                        onClick={(evt) => onHeaderColumnClick(evt, column)}
                        className={styles.headerClickTarget}
                    >
                        {(() => {
                            const annotation = pathToAnnotationMap.get(column.name);
                            const path = column.name.split(".");
                            const leafName = path[path.length - 1];
                            const prefix = path.length > 1
                                ? path.slice(0, -1).join(" / ") + " / "
                                : undefined;
                            const fullLabel = path.join(" / ");
                            const isDuplicateLeafName = duplicateLeafNames.has(leafName);
                            return (
                                <Tooltip content={`${fullLabel}\n${annotation?.description ?? ""}`}>
                                    <span className={styles.headerTitle}>
                                        {(prefix && isDuplicateLeafName) && (
                                            <span className={styles.headerTitlePrefix}>{prefix}</span>
                                        )}
                                        {leafName}
                                    </span>
                                </Tooltip>
                            );
                        })()}
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
        };
    });

    const onHeaderClick = (evt: React.MouseEvent) => {
        evt.preventDefault();
        const items: ContextMenuItem[] = [
            {
                key: "modify-columns",
                text: "Modify columns",
                title: "Modify columns displayed in the file list",
                iconProps: {
                    iconName: "TripleColumnEdit",
                },
                items: [
                    {
                        key: "available-annotations",
                        text: "Available annotations",
                        onRender() {
                            return <ColumnPicker />;
                        },
                    },
                ],
            },
        ];
        dispatch(interaction.actions.showContextMenu(items, evt.nativeEvent));
    };

    return (
        <div ref={ref} {...rest}>
            <div className={styles.headerWrapper} id={Tutorial.COLUMN_HEADERS_ID}>
                <FileRow
                    cells={headerCells}
                    className={styles.header}
                    onClick={onHeaderClick}
                    onResize={onResize}
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
