import * as classNames from "classnames";
import { zip } from "lodash";
import * as React from "react";
import { useSelector } from "react-redux";

import DirectoryTreeNodeHeader from "./DirectoryTreeNodeHeader";
import FileList from "../FileList";
import * as directoryTreeSelectors from "./selectors";
import FileSet from "../../entity/FileSet";
import FileFilter from "../../entity/FileFilter";

const styles = require("./DirectoryTreeNode.module.css");

interface DirectoryTreeNodeProps {
    ancestorNodes: string[];
    depth: number; // how far down the hierarchy this node lives
    title: string; // the "directory name" to present
}

const ICON_SIZE = 15; // in px; both width and height
const PADDING_STEP = 0; // in px

export default function DirectoryTreeNode(props: DirectoryTreeNodeProps) {
    const { ancestorNodes, depth, title } = props;

    const hierarchy = useSelector(directoryTreeSelectors.getHierarchy);
    const annotationService = useSelector(directoryTreeSelectors.getAnnotationService);
    const fileService = useSelector(directoryTreeSelectors.getFileService);

    const [collapsed, setCollapsed] = React.useState(true);
    const [content, setContent] = React.useState<JSX.Element | JSX.Element[] | null>(null);
    const [isLoadingContent, setIsLoadingContent] = React.useState(false);
    const [error, setError] = React.useState<Error | null>(null);

    React.useEffect(() => {
        let cancel = false;

        // nothing to do if the node is collapsed
        if (collapsed) {
            return;
        }

        // otherwise, need to set content
        setIsLoadingContent(true);

        async function getContent() {
            // depth is 0-indexed
            if (depth === hierarchy.length - 1) {
                // if we're at the leaf of the hierarchy, render a FileList

                const filters = zip<string, string>(hierarchy, [...ancestorNodes, title]).map(
                    (pair) => {
                        const [name, value] = pair as [string, string];
                        return new FileFilter(name, value);
                    }
                );

                const fileSet = new FileSet({
                    fileService,
                    filters,
                });

                try {
                    const totalCount = await fileSet.fetchTotalCount();
                    if (!cancel) {
                        setContent(<FileList fileSet={fileSet} totalCount={totalCount} />);
                        setError(null);
                    }
                } catch (e) {
                    console.error(
                        `Failed to fetch the total number of documents beloning to ${fileSet.toString()}`,
                        e
                    );
                    if (!cancel) {
                        setCollapsed(true);
                        setError(e);
                    }
                } finally {
                    if (!cancel) {
                        setIsLoadingContent(false);
                    }
                }
            } else {
                // otherwise, there's more hierarchy to show
                const path = [...ancestorNodes, title];

                try {
                    const values = await annotationService.fetchHierarchyValuesUnderPath(
                        hierarchy,
                        path
                    );
                    const nodes = values.map((value) => (
                        <DirectoryTreeNode
                            key={`${[...path, value].join(":")}|${hierarchy.join(":")}`}
                            ancestorNodes={path}
                            depth={depth + 1}
                            title={value}
                        />
                    ));

                    if (!cancel) {
                        setContent(nodes);
                        setError(null);
                    }
                } catch (e) {
                    console.error(
                        `Something went wrong fetching next level of hierarchy underneath ${path}`,
                        e
                    );

                    if (!cancel) {
                        setCollapsed(true);
                        setError(e);
                    }
                } finally {
                    if (!cancel) {
                        setIsLoadingContent(false);
                    }
                }
            }
        }

        getContent();

        return function cleanUp() {
            cancel = true;
        };
    }, [collapsed, ancestorNodes, annotationService, depth, fileService, hierarchy, title]);

    return (
        <li
            className={styles.treeNodeContainer}
            style={{
                paddingLeft: `${PADDING_STEP}px`,
            }}
            role="treeitem"
            aria-expanded={collapsed ? "false" : "true"}
            aria-level={depth + 1} // aria-level is 1-indexed
        >
            <DirectoryTreeNodeHeader
                collapsed={collapsed}
                error={error}
                loading={isLoadingContent}
                title={title}
                onClick={() => setCollapsed((prevCollapsed) => !prevCollapsed)}
            />
            <ul
                className={classNames(styles.children, {
                    [styles.collapsed]: collapsed,
                    [styles.fileList]: depth === hierarchy.length - 1,
                })}
                style={{ paddingLeft: `${ICON_SIZE + 8}px` }}
                role="group"
            >
                {!collapsed && content}
            </ul>
        </li>
    );
}

DirectoryTreeNode.defaultProps = {
    ancestorNodes: [],
};
