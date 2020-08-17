import classNames from "classnames";
import * as React from "react";

import Cell from "../../components/FileRow/Cell";

const styles = require("./FileAnnotationRow.module.css");

interface FileAnnotationRowProps {
    className?: string;
    name: string;
    value: string;
}

/**
 * Component responsible for rendering the metadata pertaining to a file inside the file
 * details pane on right hand side of the application.
 */
export default function FileAnnotationRow(props: FileAnnotationRowProps) {
    return (
        <div className={classNames(props.className, styles.row)}>
            <Cell className={classNames(styles.cell, styles.key)} columnKey="key" width={1}>
                {props.name}
            </Cell>
            <Cell className={classNames(styles.cell, styles.value)} columnKey="value" width={1}>
                <span style={{ userSelect: "text" }}>{props.value}</span>
            </Cell>
        </div>
    );
}
