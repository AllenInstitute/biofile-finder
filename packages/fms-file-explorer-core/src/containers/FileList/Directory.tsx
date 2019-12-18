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
    structure: Grouping;
}

interface DirectoryState {
    collapsed: boolean;
}

/**
 * Path data for icon taken from Material Design
 * Apache License 2.0 (https://github.com/google/material-design-icons/blob/master/LICENSE)
 */
const FOLDER_ICON_PATH_DATA =
    "M9.984 3.984l2.016 2.016h8.016q0.797 0 1.383 0.609t0.586 1.406v9.984q0 0.797-0.586 1.406t-1.383 0.609h-16.031q-0.797 0-1.383-0.609t-0.586-1.406v-12q0-0.797 0.586-1.406t1.383-0.609h6z";

/**
 * Path data for icon designed by Daniel Bruce (www.entypo.com)
 * License: https://creativecommons.org/licenses/by-sa/4.0/
 */
const CHEVRON_DOWN_ICON_PATH_DATA =
    "M13.418 7.859c0.271-0.268 0.709-0.268 0.978 0s0.272 0.701 0 0.969l-3.908 3.83c-0.27 0.268-0.707 0.268-0.979 0l-3.908-3.83c-0.27-0.267-0.27-0.701 0-0.969s0.709-0.268 0.978 0l3.421 3.141 3.418-3.141z";

const childrenAreFileSets = (children: FileSet[] | Grouping[]): children is FileSet[] => {
    return children[0] instanceof FileSet;
};

/**
 * TODO
 */
export default class Directory extends React.Component<DirectoryProps, DirectoryState> {
    public static defaultProps = {
        collapsed: true,
        level: 0,
    };

    public constructor(props: DirectoryProps) {
        super(props);

        this.state = {
            collapsed: true,
        };
    }

    public componentDidUpdate(prevProps: DirectoryProps) {
        if (prevProps.collapsed !== this.props.collapsed) {
            this.setState((prevState) => ({
                collapsed:
                    this.props.collapsed === undefined ? prevState.collapsed : this.props.collapsed,
            }));
        }
    }

    public render() {
        const { level, structure } = this.props;
        const { collapsed } = this.state;

        const [directoryName, children] = structure;
        const isRootDirectory = directoryName === null;

        return (
            <>
                {!isRootDirectory && (
                    <span
                        key={String(directoryName)}
                        className={styles.directoryContainer}
                        style={{ marginLeft: `${level * 10}px` }}
                        onClick={() => {
                            this.setState((prevState) => ({ collapsed: !prevState.collapsed }));
                        }}
                    >
                        <SvgIcon
                            className={classNames({
                                [styles.chevronClosed]: collapsed,
                            })}
                            height={15}
                            pathData={CHEVRON_DOWN_ICON_PATH_DATA}
                            viewBox="0 0 20 20"
                            width={15}
                        />
                        <SvgIcon
                            height={15}
                            pathData={FOLDER_ICON_PATH_DATA}
                            viewBox="0 0 24 24"
                            width={15}
                        />
                        <h4 className={styles.directoryName}>{String(directoryName)}</h4>
                    </span>
                )}
                {this.renderSubDirectory(children)}
                {this.renderFileList(children, isRootDirectory)}
            </>
        );
    }

    private renderFileList(children: FileSet[] | Grouping[], isRootDirectory: boolean) {
        const { columnWidths, displayAnnotations, rowWidth } = this.props;
        const { collapsed } = this.state;

        if (childrenAreFileSets(children)) {
            // heuristic: there's only ever 1 in the FileSet list (i.e., only ever 1 leaf node)
            const fileSet = children[0] as FileSet;
            return (
                <LazyWindowedFileList
                    key={fileSet.toQueryString()}
                    className={classNames(styles.fileList, {
                        [styles.root]: isRootDirectory,
                        [styles.collapsed]: !isRootDirectory && collapsed,
                    })}
                    collapsed={!isRootDirectory && collapsed}
                    columnWidths={columnWidths}
                    displayAnnotations={displayAnnotations}
                    fileSet={fileSet}
                    rowWidth={rowWidth}
                />
            );
        } else {
            return null;
        }
    }

    private renderSubDirectory(children: FileSet[] | Grouping[]) {
        const { columnWidths, displayAnnotations, level, rowWidth } = this.props;
        const { collapsed } = this.state;

        if (childrenAreFileSets(children)) {
            return null;
        }

        return map(children, (grouping) => {
            const [key] = grouping;
            return (
                <Directory
                    key={String(key)}
                    columnWidths={columnWidths}
                    collapsed={collapsed}
                    displayAnnotations={displayAnnotations}
                    level={level + 1}
                    rowWidth={rowWidth}
                    structure={grouping}
                />
            );
        });
    }
}
