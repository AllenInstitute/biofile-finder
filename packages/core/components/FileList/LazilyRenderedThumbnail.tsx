import classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";

import { OnSelect } from "./useFileSelector";
import LoadingIcon from "../Icons/LoadingIcon";
import Tooltip from "../Tooltip";
import FileThumbnail from "../../components/FileThumbnail";
import { FileView } from "../../entity/SearchParams";
import FileSet from "../../entity/FileSet";
import { selection } from "../../state";

import styles from "./LazilyRenderedThumbnail.module.css";

/**
 * Contextual data passed to LazilyRenderedThumbnails by react-window. Basically a light-weight React context.
 * The same data is passed to each LazilyRenderedThumbnail within the same FileGrid.
 * Follows the pattern set by LazilyRenderedRow
 */
export interface LazilyRenderedThumbnailContext {
    fileSet: FileSet;
    itemCount: number;
    measuredWidth: number;
    onContextMenu: (evt: React.MouseEvent) => void;
    onSelect: OnSelect;
}

interface LazilyRenderedThumbnailProps {
    columnIndex: number; // injected by react-window
    data: LazilyRenderedThumbnailContext; // injected by react-window
    rowIndex: number; // injected by react-window
    style: React.CSSProperties; // injected by react-window
}

const MARGIN = 20; // px;

/**
 * A single file in the listing of available files FMS.
 * Follows the pattern set by LazilyRenderedRow
 */
export default function LazilyRenderedThumbnail(props: LazilyRenderedThumbnailProps) {
    const {
        data: { fileSet, itemCount, measuredWidth, onContextMenu, onSelect },
        columnIndex,
        rowIndex,
        style,
    } = props;

    const shouldDisplaySmallFont = useSelector(selection.selectors.getShouldDisplaySmallFont);
    const fileSelection = useSelector(selection.selectors.getFileSelection);
    const fileView = useSelector(selection.selectors.getFileView);
    const fileGridColCount = useSelector(selection.selectors.getFileGridColCount);
    const overallIndex = fileGridColCount * rowIndex + columnIndex;
    const file = fileSet.getFileByIndex(overallIndex);
    const thumbnailSize = measuredWidth / fileGridColCount - 2 * MARGIN;

    const isSelected = React.useMemo(() => {
        return fileSelection.isSelected(fileSet, overallIndex);
    }, [fileSelection, fileSet, overallIndex]);

    const isFocused = React.useMemo(() => {
        return fileSelection.isFocused(fileSet, overallIndex);
    }, [fileSelection, fileSet, overallIndex]);

    const [thumbnailPath, setThumbnailPath] = React.useState<string | undefined>();
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        if (file) {
            file.getPathToThumbnail().then((path) => {
                setThumbnailPath(path);
                setIsLoading(false);
            });
        }
    }, [file]);

    const onClick = (evt: React.MouseEvent) => {
        evt.preventDefault();
        evt.stopPropagation();

        if (onSelect && file !== undefined) {
            onSelect(
                { index: overallIndex, id: file.uid },
                {
                    // Details on different OS keybindings
                    // https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent#Properties
                    ctrlKeyIsPressed: evt.ctrlKey || evt.metaKey,
                    shiftKeyIsPressed: evt.shiftKey,
                }
            );
        }
    };

    // Display the start of the file name and at least part of the file type
    const clipFileName = (filename: string) => {
        if (fileView === FileView.SMALL_THUMBNAIL && filename.length > 15) {
            return filename.slice(0, 6) + "..." + filename.slice(-4);
        } else if (filename.length > 20) {
            return filename.slice(0, 9) + "..." + filename.slice(-8);
        }
        return filename;
    };

    let content;
    if (file) {
        const filenameForRender = clipFileName(file?.name);
        content = (
            <Tooltip content={file?.name}>
                <div
                    onClick={onClick}
                    className={classNames({
                        [styles.selected]: isSelected,
                        [styles.focused]: isFocused,
                    })}
                >
                    <FileThumbnail
                        className={styles.thumbnail}
                        height={thumbnailSize}
                        width={thumbnailSize}
                        uri={thumbnailPath}
                        loading={isLoading}
                        selected={isSelected}
                    />
                    <div
                        className={classNames(styles.thumbnailLabel, {
                            [styles.smallFont]:
                                shouldDisplaySmallFont || fileView === FileView.SMALL_THUMBNAIL,
                        })}
                    >
                        {filenameForRender}
                    </div>
                </div>
            </Tooltip>
        );
    } else if (overallIndex < itemCount) {
        // Grid will attempt to render a cell even if we're past the total index
        content = (
            <div className={styles.loadingContainer}>
                <LoadingIcon data-testid="loading-spinner" />
            </div>
        );
    } // No `else` since if past total index we stil want empty content to fill up the outer grid

    return (
        <div className={styles.thumbnailWrapper} style={style} onContextMenu={onContextMenu}>
            {content}
        </div>
    );
}
