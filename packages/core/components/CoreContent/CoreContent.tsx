import * as React from "react";
import { useSelector } from "react-redux";

import QuerySidebar from "../QuerySidebar";
import GlobalActionButtonRow from "../GlobalActionButtonRow";
import DirectoryTree from "../DirectoryTree";
import DataSourcePrompt from "../DataSourcePrompt";
import RelationshipDiagram from "../RelationshipDiagram";
import { interaction, selection } from "../../state";

import styles from "./CoreContent.module.css";

/**
 * Core content of the application
 */
export default function CoreContent() {
    const origin = useSelector(interaction.selectors.getOriginForProvenance);
    const hasQuerySelected = useSelector(selection.selectors.hasQuerySelected);
    const requiresDataSourceReload = useSelector(selection.selectors.getRequiresDataSourceReload);

    const hasSomethingToQuery = hasQuerySelected || window.location.search;
    const hasNeedToSelectQuery = requiresDataSourceReload || !hasSomethingToQuery;

    if (!!origin) {
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
