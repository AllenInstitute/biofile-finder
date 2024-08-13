import { Icon } from "@fluentui/react";
import { map } from "lodash";
import * as React from "react";
import { useSelector, useDispatch } from "react-redux";

import ColumnPicker from "./ColumnPicker";
import { ContextMenuItem } from "../ContextMenu";
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
                    className={styles.headerCell}
                    onClick={() => dispatch(selection.actions.sortColumn(annotation.name))}
                    title={annotationNameToAnnotationMap[annotation.name]?.description}
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
            title: annotation.name,
            width: columnWidths[annotation.name] || 1 / columnAnnotations.length,
        };
    });

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
