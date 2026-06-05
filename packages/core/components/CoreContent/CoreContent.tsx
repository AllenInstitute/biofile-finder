import * as React from "react";
import { useSelector } from "react-redux";

import QuerySidebar from "../QuerySidebar";
import GlobalActionButtonRow from "../GlobalActionButtonRow";
import DirectoryTree from "../DirectoryTree";
import DataSourcePrompt from "../DataSourcePrompt";
import RelationshipDiagram from "../RelationshipDiagram";
import SearchParams from "../../entity/SearchParams";
import { interaction, metadata, selection } from "../../state";

import styles from "./CoreContent.module.css";

/**
 * Core content of the application
 */
export default function CoreContent() {
    const searchParams = window.location.search;
    const origin = useSelector(interaction.selectors.getOriginForProvenance);
    const edgeDefinitions = useSelector(metadata.selectors.getEdgeDefinitions);
    const hasQuerySelected = useSelector(selection.selectors.hasQuerySelected);
    const requiresDataSourceReload = useSelector(selection.selectors.getRequiresDataSourceReload);

    const hasSomethingToQuery = hasQuerySelected || window.location.search;
    const hasNeedToSelectQuery = requiresDataSourceReload || !hasSomethingToQuery;

    // The relationship diagram should only display if:
    // - the edge definitions have been fully loaded
    // - the url still contains an ID for the origin
    // - the ID for the origin can be processed into a file
    const shouldDisplayProvenanceGraph = React.useMemo(() => {
        return (
            !!origin &&
            edgeDefinitions.length > 0 &&
            !!SearchParams.decode(searchParams)?.provOriginId
        );
    }, [origin, edgeDefinitions, searchParams]);
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
