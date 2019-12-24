import * as classNames from "classnames";
import { map } from "lodash";
import * as React from "react";

import Annotation from "../../entity/Annotation";
import LazyWindowedFileList from "../LazyWindowedFileList";
import FileSet from "../../entity/FileSet";
import { FileSetTree } from "./selectors";
import SvgIcon from "../../components/SvgIcon";
import { ColumnWidths } from "./useResizableColumns";

const styles = require("./Directory.module.css");

interface DirectoryProps {
    columnWidths: ColumnWidths;
    displayAnnotations: Annotation[];
    level: number;
    rowWidth: number;
    fileSetTree: FileSetTree;
}

interface DirectoryState {
    collapsed: boolean;
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

const childrenAreFileSets = (children: FileSet[] | FileSetTree[]): children is FileSet[] => {
    return children[0] instanceof FileSet;
};

/**
 * Recursively render UI representing a directory tree. This tree's leaves are FileSets--listings of files in FMS that match a particular set of filters
 * and are potentially ordered according to user-defined sort order(s). This tree's branches are values of annotations. The path to the FileSets define
 * its set of filters. For example:
 * - foo
 *      - bar
 *          - baz
 *              file1
 *              file2
 *              file3
 *
 * Above, "foo", "bar", and "baz" are rendered as directories. The file list ("file1", "file2", and "file3") is filtered by annotation1="foo", annotation2="bar", and annotation3="baz."
 */
export default class Directory extends React.Component<DirectoryProps, DirectoryState> {
    public static defaultProps = {
        level: 0,
    };

    public constructor(props: DirectoryProps) {
        super(props);

        const [directoryName, children] = props.fileSetTree;
        const isLeaf = childrenAreFileSets(children);
        const isRootDir = directoryName === null;

        this.state = {
            collapsed: !isRootDir || isLeaf,
        };
    }

    public render() {
        return (
            <>
                {this.renderDirectoryHeader()}
                {this.renderSubDirectory()}
                {this.renderFileList()}
            </>
        );
    }

    private get directoryName(): string {
        const [directoryName] = this.props.fileSetTree;
        return String(directoryName);
    }

    private get directoryChildren(): FileSet[] | FileSetTree[] {
        const [, children] = this.props.fileSetTree;
        return children;
    }

    private get isRootDirectory(): boolean {
        const [directoryName] = this.props.fileSetTree;
        return directoryName === null;
    }

    /**
     * If not in the "root directory" (i.e., no annotation hierarchy exists yet), render a chevron showing the collapsed/expanded state of the directory,
     * a folder icon, and the name of the directory. On click of any of those elements, toggle the collapsed state.
     */
    private renderDirectoryHeader(): JSX.Element | null {
        const { level } = this.props;
        const { collapsed } = this.state;

        if (this.isRootDirectory) {
            return null;
        }

        return (
            <span
                key={this.directoryName}
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
                    className={styles.folderIcon}
                    height={15}
                    pathData={FOLDER_ICON_PATH_DATA}
                    viewBox="0 0 24 24"
                    width={15}
                />
                <h4 className={styles.directoryName}>{this.directoryName}</h4>
            </span>
        );
    }

    /**
     * If we're at the bottom of a directory tree, there should be a FileSet to render. Otherwise, return null.
     */
    private renderFileList(): JSX.Element | null {
        const { columnWidths, displayAnnotations, level, rowWidth } = this.props;
        const { collapsed } = this.state;

        if (childrenAreFileSets(this.directoryChildren)) {
            // heuristic: there's only ever 1 in the FileSet list (i.e., only ever 1 leaf node)
            const fileSet = this.directoryChildren[0];
            return (
                <div
                    className={classNames(styles.fileList, {
                        [styles.rootDirectory]: this.isRootDirectory,
                        [styles.collapsed]: !this.isRootDirectory && collapsed,
                    })}
                >
                    {(this.isRootDirectory || !collapsed) && (
                        <LazyWindowedFileList
                            key={fileSet.toQueryString()}
                            collapsed={!this.isRootDirectory && collapsed}
                            columnWidths={columnWidths}
                            displayAnnotations={displayAnnotations}
                            fileSet={fileSet}
                            level={level}
                            rowWidth={rowWidth}
                        />
                    )}
                </div>
            );
        } else {
            return null;
        }
    }

    /**
     * If we're not yet at the bottom of the directory tree, render the current directory's children (sub-directories).
     */
    private renderSubDirectory(): JSX.Element[] | null {
        const { columnWidths, displayAnnotations, level, rowWidth } = this.props;
        const { collapsed } = this.state;

        // if at the bottom of the directory tree or this directory is collapsed, no more sub-directories to render
        if (childrenAreFileSets(this.directoryChildren) || collapsed) {
            return null;
        }

        return map(this.directoryChildren, (fileSetTree) => {
            const [subDirectoryName] = fileSetTree;
            return (
                <Directory
                    key={String(subDirectoryName)}
                    columnWidths={columnWidths}
                    displayAnnotations={displayAnnotations}
                    level={level + 1}
                    rowWidth={rowWidth}
                    fileSetTree={fileSetTree}
                />
            );
        });
    }
}
