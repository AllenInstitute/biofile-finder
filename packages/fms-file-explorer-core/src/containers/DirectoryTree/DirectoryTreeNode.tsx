import * as classNames from "classnames";
import { last } from "lodash";
import * as React from "react";

import SvgIcon from "../../components/SvgIcon";
import FileList from "../FileList";
import { TreeNode } from "./useDirectoryTree";
import FileSet from "../../entity/FileSet";

const styles = require("./DirectoryTreeNode.module.css");

/**
 * Contextual data passed to DirectoryTreeNodes by react-window. Basically a light-weight React context. The same data
 * is passed to each DirectoryTreeNode.
 */
interface DirectoryTreeNodeContext {
    directoryTree: Map<number, TreeNode>;
    onClick: (fileSet: FileSet) => void;
}

interface DirectoryTreeNodeProps {
    data: DirectoryTreeNodeContext; // injected by react-window
    index: number; // injected by react-window
    style: React.CSSProperties; // injected by react-window
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

const ICON_SIZE = 15; // in px; both width and height
const PADDING_STEP = 10; // in px

/**
 * A single node in the user-constructed, virtual directory tree. The tree's branches are "folders." Its leaves have `FileList`s.
 * When rendering the "root" of the FMS file system--that is, no annotation groupings have been defined--no "directory header" is
 * rendered--only render a FileList.
 *
 * Each node is collapsible. Collapsing a node will cause all of its children to collapse as well.
 */
export default class DirectoryTreeNode extends React.Component<DirectoryTreeNodeProps> {
    public render(): JSX.Element | null {
        const { style } = this.props;

        const node = this.treeNode;

        if (!node) {
            return null;
        }

        const containerPaddingLeft = node.depth * PADDING_STEP;
        const fileListPaddingLeft = node.isRoot ? 0 : ICON_SIZE + 8; // 8 == amount of padding between icons, defined in `DirectoryTreeNode.module.css` under `.folder-icon`

        return (
            <div
                className={styles.treeNodeContainer}
                style={Object.assign({}, style, {
                    paddingLeft: `${containerPaddingLeft}px`,
                })}
            >
                {this.renderDirectoryHeader()}
                {(node.isLeaf || node.isRoot) && !node.isCollapsed ? (
                    <div
                        className={classNames(styles.fileList, {
                            [styles.nonRootFileList]: !node.isRoot,
                        })}
                        style={{ paddingLeft: `${fileListPaddingLeft}px` }}
                    >
                        <FileList fileSet={node.fileSet} />
                    </div>
                ) : null}
            </div>
        );
    }

    private get treeNode(): TreeNode | undefined {
        const { data, index } = this.props;
        const node = data.directoryTree.get(index);

        return node;
    }

    private get directoryName(): string {
        const node = this.treeNode;

        if (!node) {
            return "";
        }

        const { fileSet } = node;
        const lastAppliedFilter = last(fileSet.filters);
        return lastAppliedFilter ? String(lastAppliedFilter.value) : "";
    }

    private renderDirectoryHeader(): JSX.Element | null {
        const { data } = this.props;
        const { onClick } = data;
        const node = this.treeNode;
        if (!node || node.isRoot) {
            return null;
        }

        return (
            <span className={styles.directoryHeader} onClick={() => onClick(node.fileSet)}>
                <SvgIcon
                    className={classNames({
                        [styles.chevronClosed]: node.isCollapsed,
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
                <h4 className={styles.directoryName}>{this.directoryName}</h4>
            </span>
        );
    }
}
