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

    return (
        <>
            <div className={styles.coreContent}>
                <QuerySidebar className={styles.querySidebar} />
                <div className={styles.center}>
                    {!requiresDataSourceReload &&
                    (hasQuerySelected || window.location.search) ? (
                        <>
                            <GlobalActionButtonRow className={styles.globalButtonRow} />
                            <DirectoryTree className={styles.fileList} />
                        </>
                    ) : (
                        <DataSourcePrompt className={styles.dataSourcePrompt} />
                    )}
                </div>
            </div>
            <RelationshipDiagram origin={origin} />
        </>
    );
}
