import classNames from "classnames";
import { Spinner, SpinnerSize } from "office-ui-fabric-react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import Tippy from "@tippy.js/react";
import "tippy.js/dist/tippy.css"; // side-effect

import getContextMenuItems from "../ContextMenu/items";
import SvgIcon from "../../components/SvgIcon";
import { interaction, selection } from "../../state";
import FileFilter from "../../entity/FileFilter";
import FileSet from "../../entity/FileSet";

const styles = require("./DirectoryTreeNode.module.css");

interface DirectoryTreeNodeHeaderProps {
    collapsed: boolean;
    error: Error | null;
    fileFolderPath: string[];
    fileSet: FileSet;
    isLeaf: boolean;
    loading: boolean;
    onClick: () => void;
    title: string;
}

/**
 * Path data for icon taken from Material Design
 * Apache License 2.0: https://github.com/google/material-design-icons/blob/master/LICENSE
 */
const FOLDER_ICON_PATH_DATA =
    "M9.984 3.984l2.016 2.016h8.016q0.797 0 1.383 0.609t0.586 1.406v9.984q0 0.797-0.586 1.406t-1.383 0.609h-16.031q-0.797 0-1.383-0.609t-0.586-1.406v-12q0-0.797 0.586-1.406t1.383-0.609h6z";

/**
 * Path data for icon designed by Daniel Bruce (www.entypo.com)
 * License: https://creativecommons.org/licenses/by-sa/4.0/
 */
const CHEVRON_DOWN_ICON_PATH_DATA =
    "M13.418 7.859c0.271-0.268 0.709-0.268 0.978 0s0.272 0.701 0 0.969l-3.908 3.83c-0.27 0.268-0.707 0.268-0.979 0l-3.908-3.83c-0.27-0.267-0.27-0.701 0-0.969s0.709-0.268 0.978 0l3.421 3.141 3.418-3.141z";

/**
 * Path data for icon taken from Material Design
 * Apache License 2.0: https://github.com/google/material-design-icons/blob/master/LICENSE
 */
const ERROR_ICON_PATH_DATA =
    "M12 20.016q3.281 0 5.648-2.367t2.367-5.648-2.367-5.648-5.648-2.367-5.648 2.367-2.367 5.648 2.367 5.648 5.648 2.367zM12 2.016q4.125 0 7.055 2.93t2.93 7.055-2.93 7.055-7.055 2.93-7.055-2.93-2.93-7.055 2.93-7.055 7.055-2.93zM11.016 6.984h1.969v6h-1.969v-6zM11.016 15h1.969v2.016h-1.969v-2.016z";

const ICON_SIZE = 15; // in px; both width and height

/**
 * A "directory" name--i.e., an annotation value. It is a memozied component because Tippy is
 * not cheap to initialize.
 */
export default React.memo(function DirectoryTreeNodeHeader(props: DirectoryTreeNodeHeaderProps) {
    const { collapsed, error, fileFolderPath, fileSet, isLeaf, loading, onClick, title } = props;

    const [isContextMenuActive, setContextMenuActive] = React.useState(false);

    const fileSelections = useSelector(selection.selectors.getFileSelection);
    const countSelectionsUnderneathFolder = React.useMemo(() => {
        return fileSelections.count(fileSet.filters);
    }, [fileSelections, fileSet]);

    const dispatch = useDispatch();
    const annotationHierarchy = useSelector(selection.selectors.getAnnotationHierarchy);

    const onContextMenu = (evt: React.MouseEvent) => {
        const availableItems = getContextMenuItems(dispatch);
        const fileFolderFilters = fileFolderPath.map(
            (value, index) => new FileFilter(annotationHierarchy[index].name, value)
        );
        const items = [
            {
                ...availableItems.DOWNLOAD,
                subMenuProps: {
                    ...availableItems.DOWNLOAD.subMenuProps,
                    items: availableItems.DOWNLOAD.subMenuProps.items.map((item) => {
                        if (item.key !== "manifest") {
                            return item;
                        }
                        return {
                            ...item,
                            onClick() {
                                dispatch(
                                    interaction.actions.toggleManifestDownloadDialog(
                                        fileFolderFilters
                                    )
                                );
                            },
                        };
                    }),
                },
            },
        ];
        const onDismiss = () => {
            setContextMenuActive(false);
        };
        dispatch(interaction.actions.showContextMenu(items, evt.nativeEvent, onDismiss));
        setContextMenuActive(true);
    };

    // Render a badge indicating the total number of file selections that can be found underneath this
    // DirectoryTreeNode. But only render it if:
    //  1. there are in fact selections to be found underneath this node, and
    //  2. this node is collapsed OR this node is a leaf node (its child is a file list)
    const showSelectionCountBadge = countSelectionsUnderneathFolder > 0 && (collapsed || isLeaf);
    let selectionCountBadge = null;
    if (showSelectionCountBadge) {
        let text = "selection";

        if (countSelectionsUnderneathFolder > 1) {
            text = "selections"; // make it plural
        }

        selectionCountBadge = (
            <div className={styles.selectionCountBadge}>
                {`${countSelectionsUnderneathFolder} ${text}`}
            </div>
        );
    }

    return (
        <span
            className={classNames(styles.directoryHeader, {
                [styles.focused]: isContextMenuActive,
            })}
            data-testid="treeitemheader"
            onClick={onClick}
            onContextMenu={onContextMenu}
        >
            <SvgIcon
                className={classNames({
                    [styles.chevronClosed]: collapsed,
                })}
                height={ICON_SIZE}
                pathData={CHEVRON_DOWN_ICON_PATH_DATA}
                viewBox="0 0 20 20"
                width={ICON_SIZE}
            />
            <SvgIcon
                className={styles.folderIcon}
                height={ICON_SIZE}
                pathData={FOLDER_ICON_PATH_DATA}
                viewBox="0 0 24 24"
                width={ICON_SIZE}
            />
            <h4 className={styles.directoryName}>{title}</h4>
            {selectionCountBadge}
            {loading && <Spinner size={SpinnerSize.small} />}
            {!loading && error && (
                <Tippy content={error.message}>
                    <SvgIcon
                        className={styles.errorIcon}
                        height={ICON_SIZE}
                        pathData={ERROR_ICON_PATH_DATA}
                        viewBox="0 0 24 24"
                        width={ICON_SIZE}
                    />
                </Tippy>
            )}
        </span>
    );
});
