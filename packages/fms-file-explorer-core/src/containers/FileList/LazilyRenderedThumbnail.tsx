import classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";

import FileSet from "../../entity/FileSet";
import NumericRange from "../../entity/NumericRange";
import { interaction, selection } from "../../state";
import { OnSelect } from "./useFileSelector";
import SvgIcon from "../../components/SvgIcon";
import FileThumbnail from "../../components/FileThumbnail";

const styles = require("./LazilyRenderedThumbnail.module.css");

/**
 * Contextual data passed to LazilyRenderedRows by react-window. Basically a light-weight React context. The same data
 * is passed to each LazilyRenderedRow within the same FileList.
 */
export interface LazilyRenderedThumbnailContext {
    fileSet: FileSet;
    onContextMenu: (evt: React.MouseEvent) => void;
    onSelect: OnSelect;
}

interface LazilyRenderedThumbnailProps {
    data: LazilyRenderedThumbnailContext; // injected by react-window
    columnIndex: number; // injected by react-window
    rowIndex: number; // injected by react-window
    style: React.CSSProperties; // injected by react-window
}

/**
 * Path data for icon taken from Material Design
 * Apache License 2.0: https://github.com/google/material-design-icons/blob/master/LICENSE
 */
const FILE_ICON_PATH_DATA =
    "M19.5 3h0.5l6 7v18.009c0 1.093-0.894 1.991-1.997 1.991h-15.005c-1.107 0-1.997-0.899-1.997-2.007v-22.985c0-1.109 0.897-2.007 2.003-2.007h10.497zM19 4h-10.004c-0.55 0-0.996 0.455-0.996 0.995v23.009c0 0.55 0.455 0.995 1 0.995h15c0.552 0 1-0.445 1-0.993v-17.007h-4.002c-1.103 0-1.998-0.887-1.998-2.006v-4.994zM20 4.5v4.491c0 0.557 0.451 1.009 0.997 1.009h3.703l-4.7-5.5z";

const RENDERABLE_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg"];

const formatFileNameForDisplay = (fileName: string) => {
    if (fileName.length > 20) {
        return (
            fileName.substr(0, 10) + "..." + fileName.substr(fileName.length - 5, fileName.length)
        );
    }

    return fileName;
};

/**
 * A single file in the listing of available files FMS.
 */
export default function LazilyRenderedThumbnail(props: LazilyRenderedThumbnailProps) {
    const {
        data: { fileSet, onContextMenu, onSelect },
        columnIndex,
        rowIndex,
        style,
    } = props;

    const fileService = useSelector(interaction.selectors.getFileService);
    const selectedFileRangesByFileSet = useSelector(
        selection.selectors.getSelectedFileRangesByFileSet
    );

    const selections: NumericRange[] = selectedFileRangesByFileSet[fileSet.hash] || [];

    const index = rowIndex * 3 + columnIndex;
    const file = fileSet.getFileByIndex(index);

    const isSelected = React.useMemo(() => {
        return selections.some((range: NumericRange) => range.contains(index));
    }, [selections, index]);

    let content;
    if (file) {
        let innerContent = (
            <SvgIcon
                className={classNames(styles.thumbnail, { [styles.selected]: isSelected })}
                height={100}
                pathData={FILE_ICON_PATH_DATA}
                viewBox="0 0 32 32"
                width={100}
            />
        );

        if (RENDERABLE_IMAGE_EXTENSIONS.some((ext) => file.fileName.endsWith(ext))) {
            innerContent = (
                <FileThumbnail
                    className={classNames(styles.thumbnail, { [styles.selected]: isSelected })}
                    uri={`${fileService.baseUrl}/labkey/fmsfiles/image${file.filePath}`}
                />
            );
        }

        content = (
            <div
                className={styles.figure}
                onClick={(evt) => {
                    onSelect(
                        { index, id: file.fileId },
                        {
                            ctrlKeyIsPressed: evt.ctrlKey || evt.metaKey,
                            shiftKeyIsPressed: evt.shiftKey,
                        }
                    );
                }}
            >
                {innerContent}
                <p className={classNames(styles.caption, { [styles.selected]: isSelected })}>
                    {formatFileNameForDisplay(`(${index}) ${file.fileName}`)}
                </p>
            </div>
        );
    } else {
        content = "Loading...";
    }

    return (
        <div style={style} onContextMenu={onContextMenu}>
            {content}
        </div>
    );
}
