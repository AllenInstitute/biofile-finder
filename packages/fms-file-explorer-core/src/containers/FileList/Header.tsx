import { find, map } from "lodash";
import * as React from "react";
import { useSelector, useDispatch } from "react-redux";

import { ContextMenuItem } from "../ContextMenu";
import getContextMenuItems from "../ContextMenu/items";
import FileRow from "../../components/FileRow";
import { interaction, metadata, selection } from "../../state";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../state/metadata/reducer";

const styles = require("./Header.module.css");

/**
 * The FileList table header. Its cells are determined by the annotations the user has selected to display. It is rendered directly into the virtualized list within the FileList component
 * (as the `outerElementType` on `FixedSizeList`) and maintained at the top of the list using position:sticky. This is done because the scrollbar width in the `FixedSizeList`
 * (which affects its innerWidth) greatly complicates lining up the header cells with the data rendered into the virtualized list. The individual `LazilyRenderedRow`s rendered by
 * `FixedSizeList` are the `children` passed to this component. They are absolutely positioned by `react-window`, and wrapped in a relatively positioned container to keep them under the
 * header.
 */
function Header(
    { children, ...rest }: React.PropsWithChildren<{}>,
    ref: React.Ref<HTMLDivElement>
) {
    const dispatch = useDispatch();
    const columnAnnotations = useSelector(selection.selectors.getAnnotationsToDisplay);
    const allAnnotations = useSelector(metadata.selectors.getAnnotations);
    const allAnnotationsSorted = allAnnotations.sort((a, b) =>
        a.displayName.localeCompare(b.displayName)
    );
    const nonColumnAnnotations = [...TOP_LEVEL_FILE_ANNOTATIONS, ...allAnnotationsSorted].filter(
        (a) => !find(columnAnnotations, (ca) => ca.name === a.name)
    );

    const headerCells = map(columnAnnotations, (annotation) => ({
        columnKey: annotation.name, // needs to match the value used to produce `column`s passed to the `useResizableColumns` hook
        displayValue: annotation.displayName,
        width: 1 / columnAnnotations.length,
    }));

    const onHeaderColumnContextMenu = (columnKey: string, evt: React.MouseEvent) => {
        const availableItems = getContextMenuItems(dispatch);
        const items: ContextMenuItem[] = [
            {
                ...availableItems.ADD_COLUMN,
                subMenuProps: {
                    items: nonColumnAnnotations.map((a) => ({
                        key: a.name,
                        text: a.displayName,
                        title: a.description,
                        onClick() {
                            dispatch(selection.actions.selectDisplayAnnotation(a));
                        },
                    })),
                },
            },
        ];
        // Prevent the user from removing all columns at once
        if (columnAnnotations.length > 1) {
            // Find the annotation matching the column, could be a file level annotation
            const currentColumnAnnotation = find(columnAnnotations, (a) => a.name === columnKey);
            items.push({
                ...availableItems.REMOVE_COLUMN,
                onClick() {
                    currentColumnAnnotation &&
                        dispatch(
                            selection.actions.deselectDisplayAnnotation(currentColumnAnnotation)
                        );
                },
            });
        }
        dispatch(interaction.actions.showContextMenu(items, evt.nativeEvent));
    };

    return (
        <div ref={ref} {...rest}>
            <div className={styles.headerWrapper}>
                <FileRow
                    cells={headerCells}
                    className={styles.header}
                    onContextMenu={onHeaderColumnContextMenu}
                />
            </div>
            <div className={styles.listParent}>{children}</div>
        </div>
    );
}

export default React.forwardRef<HTMLDivElement, React.PropsWithChildren<{}>>(Header);
