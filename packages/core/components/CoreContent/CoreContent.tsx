import * as React from "react";
import { useSelector } from "react-redux";

import QuerySidebar from "../QuerySidebar";
import GlobalActionButtonRow from "../GlobalActionButtonRow";
import DirectoryTree from "../DirectoryTree";
import DataSourcePrompt from "../DataSourcePrompt";
import RelationshipDiagram from "../RelationshipDiagram";
import { metadata, selection } from "../../state";

import styles from "./CoreContent.module.css";

/**
 * Core content of the application
 */
export default function CoreContent() {
    const origin = useSelector(selection.selectors.getOriginForProvenance);
    const edgeDefinitions = useSelector(metadata.selectors.getEdgeDefinitions);
    const hasQuerySelected = useSelector(selection.selectors.hasQuerySelected);
    const requiresDataSourceReload = useSelector(selection.selectors.getRequiresDataSourceReload);
    const x = useSelector(selection.selectors.getCurrentQueryParts);
    console.log("search", x);

    const hasSomethingToQuery = hasQuerySelected || window.location.search;
    const hasNeedToSelectQuery = requiresDataSourceReload || !hasSomethingToQuery;

    // The relationship diagram should only display if:
    // - an origin file has been resolved into state
    // - the edge definitions have been fully loaded
    const shouldDisplayProvenanceGraph = !!origin && edgeDefinitions.length > 0;
    console.log(origin, shouldDisplayProvenanceGraph, edgeDefinitions.length);
    if (shouldDisplayProvenanceGraph) {
        return <RelationshipDiagram className={styles.diagram} origin={origin} />;
    }

    return (
        <div className={styles.coreContent}>
            <QuerySidebar className={styles.querySidebar} />
            <div className={styles.center}>
                {hasNeedToSelectQuery ? (
                    <DataSourcePrompt className={styles.dataSourcePrompt} />
                ) : (
                    <>
                        <GlobalActionButtonRow className={styles.globalButtonRow} />
                        <DirectoryTree className={styles.fileList} />
                    </>
                )}
            </div>
        </div>
    );
}
