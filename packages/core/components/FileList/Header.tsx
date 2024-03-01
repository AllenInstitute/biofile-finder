import { Icon } from "@fluentui/react";
import classNames from "classnames";
import { map } from "lodash";
import * as React from "react";
import { useSelector, useDispatch } from "react-redux";

import { ContextMenuItem } from "../ContextMenu";
import getContextMenuItems from "../ContextMenu/items";
import FileRow, { CellConfig } from "../../components/FileRow";
import { SortOrder } from "../../entity/FileSort";
import Tutorial from "../../entity/Tutorial";
import { interaction, selection } from "../../state";
import FileListColumnPicker from "./FileListColumnPicker";

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
    const columnAnnotations = useSelector(selection.selectors.getAnnotationsToDisplay);
    const columnWidths = useSelector(selection.selectors.getColumnWidths);
    const sortColumn = useSelector(selection.selectors.getSortColumn);

    const onResize = (columnKey: string, nextWidthPercent?: number) => {
        if (nextWidthPercent) {
            dispatch(selection.actions.resizeColumn(columnKey, nextWidthPercent));
        } else {
            dispatch(selection.actions.resetColumnWidth(columnKey));
        }
    };
    const headerCells: CellConfig[] = map(columnAnnotations, (annotation) => {
        const isSortedColumn = sortColumn?.annotationName === annotation.name;
        return {
            columnKey: annotation.name, // needs to match the value used to produce `column`s passed to the `useResizableColumns` hook
            displayValue: (
                <span
                    className={classNames(styles.headerCell, {
                        [styles.bold]: isSortedColumn,
                    })}
                    onClick={() => dispatch(selection.actions.sortColumn(annotation.name))}
                >
                    <span className={styles.headerTitle}>{annotation.displayName}</span>
                    {isSortedColumn &&
                        (sortColumn?.order === SortOrder.DESC ? (
                            <Icon className={styles.sortIcon} iconName="ChevronDown" />
                        ) : (
                            <Icon className={styles.sortIcon} iconName="ChevronUp" />
                        ))}
                </span>
            ),
            width: columnWidths[annotation.name] || 1 / columnAnnotations.length,
        };
    });

    const onHeaderColumnContextMenu = (evt: React.MouseEvent) => {
        const availableContextMenuItem = getContextMenuItems(dispatch);

        const items: ContextMenuItem[] = [
            {
                ...availableContextMenuItem.MODIFY_COLUMNS,
                subMenuProps: {
                    items: [
                        {
                            key: "available-annotations",
                            text: "Available annotations",
                            onRender() {
                                return <FileListColumnPicker />;
                            },
                        },
                    ],
                },
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
                    onContextMenu={onHeaderColumnContextMenu}
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
