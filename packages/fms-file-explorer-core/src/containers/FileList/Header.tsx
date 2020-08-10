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
    const sortedAnnotations = useSelector(metadata.selectors.getAnnotationsSorted);
    const columnAnnotations = useSelector(selection.selectors.getAnnotationsToDisplay);

    const headerCells = map(columnAnnotations, (annotation) => ({
        columnKey: annotation.name, // needs to match the value used to produce `column`s passed to the `useResizableColumns` hook
        displayValue: annotation.displayName,
        width: 1 / columnAnnotations.length,
    }));

    const onHeaderColumnContextMenu = (columnKey: string, evt: React.MouseEvent) => {
        const availableItems = getContextMenuItems(dispatch);
        const items: ContextMenuItem[] = [
            {
                ...availableItems.MODIFY_COLUMNS,
                subMenuProps: {
                    items: [...TOP_LEVEL_FILE_ANNOTATIONS, ...sortedAnnotations].map((a) => {
                        const alreadySelected = Boolean(
                            find(columnAnnotations, (ca) => a.name === ca.name)
                        );
                        return {
                            canCheck: true,
                            checked: alreadySelected,
                            key: a.name,
                            text: a.displayName,
                            title: a.description,
                            onClick() {
                                // If the annotation is already present as a column, deselect it
                                if (alreadySelected) {
                                    dispatch(selection.actions.deselectDisplayAnnotation(a));
                                } else {
                                    dispatch(selection.actions.selectDisplayAnnotation(a));
                                }
                            },
                        };
                    }),
                },
            },
        ];
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
