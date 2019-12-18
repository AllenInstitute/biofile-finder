import * as classNames from "classnames";
import { map } from "lodash";
import * as React from "react";

import Annotation from "../../entity/Annotation";
import LazyWindowedFileList from "../LazyWindowedFileList";
import FileSet from "../../entity/FileSet";
import { Grouping } from "./selectors";
import SvgIcon from "../../components/SvgIcon";
import { ColumnWidths } from "./useResizableColumns";

const styles = require("./Directory.module.css");

interface DirectoryProps {
    columnWidths: ColumnWidths;
    collapsed?: boolean;
    displayAnnotations: Annotation[];
    level: number;
    rowWidth: number;
    structure: Grouping | FileSet[];
}

/**
 * Path data for icons taken from Material Design
 * Apache License 2.0 (https://github.com/google/material-design-icons/blob/master/LICENSE)
 */
const FOLDER_ICON_PATH_DATA =
    "M9.984 3.984l2.016 2.016h8.016q0.797 0 1.383 0.609t0.586 1.406v9.984q0 0.797-0.586 1.406t-1.383 0.609h-16.031q-0.797 0-1.383-0.609t-0.586-1.406v-12q0-0.797 0.586-1.406t1.383-0.609h6z";

export default function Directory(props: DirectoryProps) {
    const {
        columnWidths,
        collapsed: parentCollapsed,
        displayAnnotations,
        level,
        rowWidth,
        structure,
    } = props;
    const [collapsed, setCollapsed] = React.useState(parentCollapsed);

    React.useEffect(() => {
        setCollapsed(parentCollapsed);
    }, [parentCollapsed]);

    const isRootDirectory =
        Array.isArray(structure) && structure.length === 2 && structure[0] === null;

    return (
        <>
            {map(structure, (value) => {
                if (Array.isArray(value)) {
                    if (value[0] instanceof FileSet) {
                        // heuristic: there's only ever 1 in the FileSet list (i.e., only ever 1 leaf node)
                        const fileSet = value[0] as FileSet;
                        return (
                            <LazyWindowedFileList
                                key={fileSet.toQueryString()}
                                columnWidths={columnWidths}
                                className={classNames(styles.fileList, {
                                    [styles.collapsed]: !isRootDirectory && collapsed,
                                })}
                                displayAnnotations={displayAnnotations}
                                fileSet={fileSet}
                                rowWidth={rowWidth}
                            />
                        );
                    } else {
                        const key = String(value[0]);
                        return (
                            <Directory
                                key={key}
                                columnWidths={columnWidths}
                                collapsed={collapsed}
                                displayAnnotations={displayAnnotations}
                                level={level + 1}
                                rowWidth={rowWidth}
                                structure={value}
                            />
                        );
                    }
                } else if (value === null) {
                    return null;
                } else {
                    return (
                        <span
                            key={String(value)}
                            className={styles.directoryContainer}
                            style={{ marginLeft: `${level * 10}px` }}
                        >
                            <SvgIcon
                                height={15}
                                pathData={FOLDER_ICON_PATH_DATA}
                                viewBox="0 0 24 24"
                                width={15}
                            />
                            <h4
                                className={styles.directoryName}
                                onClick={() => {
                                    setCollapsed((prev) => !prev);
                                }}
                            >
                                {String(value)}
                            </h4>
                        </span>
                    );
                }
            })}
        </>
    );
}

Directory.defaultProps = {
    collapsed: true,
    level: 0,
};
