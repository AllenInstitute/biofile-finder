import * as React from "react";

import Cell from "../../components/FileRow/Cell";

const styles = require("./FileAnnotationRow.module.css");

interface FileAnnotationRowProps {
    key: string;
    value: string;
}

/**
 * Component responsible for rendering the metadata pertaining to a file inside the file
 * details pane on right hand side of the application.
 */
export default function FileAnnotationRow({ key, value }: FileAnnotationRowProps) {
    return (
        <div>
            <Cell className={styles.rowKey} columnKey="key" width={0.4}>
                {name}
            </Cell>
            <Cell columnKey="value" width={0.6}>
                {value}
            </Cell>
        </div>
    );
}
