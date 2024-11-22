import { Icon } from "@fluentui/react";
import { map } from "lodash";
import * as React from "react";
import { useSelector, useDispatch } from "react-redux";

import ColumnPicker from "./ColumnPicker";
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
    const columns = useSelector(selection.selectors.getColumns);
    const sortColumn = useSelector(selection.selectors.getSortColumn);

    const onResize = (name: string, width?: number) => {
        // Default to 0.25 if width is undefined
        // which resets the column width to the default
        dispatch(selection.actions.resizeColumn({ name, width: width || 0.25 }));
    };
    const headerCells: CellConfig[] = map(columns, (column) => ({
        // needs to match the value used to produce `column`s passed to the `useResizableColumns` hook
        columnKey: column.name,
        displayValue: (
            <span
                className={styles.headerCell}
                onClick={() => dispatch(selection.actions.sortColumn(column.name))}
            >
                <Tooltip content={annotationNameToAnnotationMap[column.name]?.description}>
                    <span className={styles.headerTitle}>
                        {annotationNameToAnnotationMap[column.name]?.displayName}
                    </span>
                </Tooltip>
                {sortColumn?.annotationName === column.name &&
                    (sortColumn?.order === SortOrder.DESC ? (
                        <Icon className={styles.sortIcon} iconName="ChevronDown" />
                    ) : (
                        <Icon className={styles.sortIcon} iconName="ChevronUp" />
                    ))}
            </span>
        ),
        width: column.width,
    }));

    const onHeaderColumnContextMenu = (evt: React.MouseEvent) => {
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
