import * as classNames from "classnames";
import * as React from "react";

import SvgIcon from "../../components/SvgIcon";
import LazyWindowedFileList from "../LazyWindowedFileList";
import { TreeNode } from "./selectors";

const styles = require("./DirectoryTreeNode.module.css");

interface RowProps {
    data: {
        directoryTree: Map<number, TreeNode>;
        isCollapsed: (index: number | null) => boolean;
        onClick: (index: number) => void;
    };
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

/**
 * TODO
 */
export default class DirectoryTreeNode extends React.Component<RowProps> {
    render() {
        const { data, index, style } = this.props;

        const { isCollapsed } = data;
        const node = this.treeNode;

        if (!node || isCollapsed(node.parent)) {
            return null;
        }

        return (
            <div
                style={Object.assign({}, style, {
                    display: "flex",
                    flexDirection: "column",
                    paddingLeft: `${node.depth * 10}px`,
                })}
            >
                {this.renderDirectoryHeader()}
                {node.fileSet && !isCollapsed(index) ? (
                    <LazyWindowedFileList
                        key={node.fileSet.toQueryString()}
                        fileSet={node.fileSet}
                        level={node.depth}
                    />
                ) : null}
            </div>
        );
    }

    private get isCollapsed(): boolean {
        const { data, index } = this.props;
        const { isCollapsed } = data;

        if (!this.treeNode) {
            return false;
        }

        return isCollapsed(index);
    }

    private get treeNode(): TreeNode | undefined {
        const { data, index } = this.props;
        const node = data.directoryTree.get(index);

        return node;
    }

    private renderDirectoryHeader(): JSX.Element | null {
        const { data, index } = this.props;
        const { onClick } = data;
        const node = this.treeNode;
        if (!node || node.isRoot) {
            return null;
        }

        return (
            <span className={styles.directoryContainer} onClick={() => onClick(index)}>
                <SvgIcon
                    className={classNames({
                        [styles.chevronClosed]: this.isCollapsed,
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
                <h4 className={styles.directoryName}>{node.dir}</h4>
            </span>
        );
    }
}
