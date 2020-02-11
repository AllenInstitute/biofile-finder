import * as classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";

import DirectoryTreeNode from "./DirectoryTreeNode";
import RootLoadingIndicator from "./RootLoadingIndicator";
import * as directoryTreeSelectors from "./selectors";
import FileSet from "../../entity/FileSet";
import FileList from "../FileList";

const styles = require("./DirectoryTree.module.css");

interface FileListProps {
    className?: string;
}

/**
 * Central UI dedicated to showing lists of available files in FMS. Can be a flat list in the case that no annotation
 * hierarchies have been applied, or nested in the case that the user has declared how (i.e., by which annotations) the
 * files should be grouped. E.g.:
 *
 * [collapsible folder] ScientistA
 *      [collapsible folder] plate123
 *      [collapsible folder] plate456
 *      [collapsible folder] plate789
 * [collapsible folder] ScientistB
 *      [collapsible folder] plate123
 *      [collapsible folder] plate456
 *      [collapsible folder] plate789
 */
export default function DirectoryTree(props: FileListProps) {
    const hierarchy = useSelector(directoryTreeSelectors.getHierarchy);
    const annotationService = useSelector(directoryTreeSelectors.getAnnotationService);
    const fileService = useSelector(directoryTreeSelectors.getFileService);

    const [isLoading, setIsLoading] = React.useState(false);
    const [content, setContent] = React.useState<JSX.Element | JSX.Element[] | null>(null);

    React.useEffect(() => {
        // mechanism for canceling a setstate if this effect has been run again
        // before async requests have return
        let cancel = false;

        setIsLoading(true);

        if (hierarchy.length) {
            annotationService
                .fetchRootHierarchyValues(hierarchy)
                .then((values) => {
                    if (!cancel) {
                        const nextContent = values.map((value) => (
                            <DirectoryTreeNode
                                key={`${value}|${hierarchy.join(":")}`}
                                title={value}
                                depth={0}
                            />
                        ));
                        setContent(nextContent);
                    }
                })
                .catch((e) => {
                    console.error("Failed to construct root of hierarchy", e);
                })
                .finally(() => {
                    if (!cancel) {
                        setIsLoading(false);
                    }
                });
        } else {
            const fileSet = new FileSet({ fileService });
            fileSet
                .fetchTotalCount()
                .then((totalCount) => {
                    if (!cancel) {
                        setContent(() => <FileList fileSet={fileSet} totalCount={totalCount} />);
                    }
                })
                .catch((e) => {
                    console.error("Failed to construct root of hierarchy", e);
                })
                .finally(() => {
                    if (!cancel) {
                        setIsLoading(false);
                    }
                });
        }

        return function cleanUp() {
            cancel = true;
        };
    }, [hierarchy, annotationService, fileService]);

    return (
        <div className={classNames(props.className, styles.container)} role="Tree">
            <RootLoadingIndicator visible={isLoading} />
            <div className={styles.scrollContainer}>{content}</div>
        </div>
    );
}
