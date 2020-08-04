import classNames from "classnames";
import * as React from "react";

import Cell from "../../components/FileRow/Cell";

const styles = require("./FileAnnotationRow.module.css");

interface FileAnnotationRowProps {
    name: string;
    value: string;
}

/**
 * Component responsible for rendering the metadata pertaining to a file inside the file
 * details pane on right hand side of the application.
 */
export default function FileAnnotationRow({ name, value }: FileAnnotationRowProps) {
    return (
        <div>
            <Cell className={classNames(styles.cell, styles.rowKey)} columnKey="key" width={0.4}>
                {name}
            </Cell>
            <Cell className={styles.cell} columnKey="value" width={0.6}>
                <span style={{ userSelect: "text" }}>{value}</span>
            </Cell>
        </div>
    );
}
