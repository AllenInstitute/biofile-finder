import classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";

import { selection } from "../../state";;

const styles = require("./AggregateInfoBox.module.css");

/**
 * An information box display for displaying aggregate information about the
 * files selected
 */
export default function AggregateInfoBox() {
    const fileSelection = useSelector(selection.selectors.getFileSelection);
    const totalFilesSelected = fileSelection.size();
    const [totalFileSize, setTotalFileSize] = React.useState(0);
    React.useEffect(() => {
        if (!totalFilesSelected) {
            setTotalFileSize(0);
        } else {
            // TODO: Use fileSet endpoint to collect aggregate sizes...
            setTotalFileSize(totalFilesSelected * 2);
        }
    }, [fileSelection]);

    if (!totalFileSize) {
        return <div />
    }
    
    return (
        <div className={classNames(styles.box)}>
            <div className={classNames(styles.innerBox)}>
                <h3 className={styles.header}>Aggregated File Info</h3>
                <div className={classNames(styles.container, styles.column)}>
                    <div>
                        {totalFileSize}
                    </div>
                    <div className={styles.label}>
                        Total File <br /> Size
                    </div>
                </div>
                <div className={classNames(styles.container, styles.column)}>
                    <div>
                        {totalFilesSelected}
                    </div>
                    <div className={styles.label}>
                        Total Files <br /> Selected
                    </div>
                </div>
            </div>
        </div>
    )
}
