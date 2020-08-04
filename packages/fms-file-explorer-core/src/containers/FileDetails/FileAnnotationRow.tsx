import classNames from "classnames";
import * as React from "react";
import Tippy from "@tippy.js/react";

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
    const [autoResize, setAutoResize] = React.useState(false);
    const toggleAutoResize = () => {
        setAutoResize(!autoResize);
    };
    return (
        <div className={styles.row}>
            <Cell
                disableResizeTarget
                className={classNames(styles.cell, styles.rowKey, {
                    [styles.autoResize]: autoResize,
                })}
                columnKey="key"
                width={0.4}
                onResize={toggleAutoResize}
            >
                {autoResize ? (
                    name
                ) : (
                    <Tippy content={name} delay={[600, null]} placement="top-start">
                        <div>{name}</div>
                    </Tippy>
                )}
            </Cell>
            <Cell
                disableResizeTarget
                className={classNames(styles.cell, styles.rowValue, {
                    [styles.autoResize]: autoResize,
                })}
                columnKey="value"
                width={0.6}
                onResize={toggleAutoResize}
            >
                {autoResize ? (
                    <div style={{ userSelect: "text" }}>{value}</div>
                ) : (
                    <Tippy content={value} delay={[600, null]} placement="top-start">
                        <div style={{ userSelect: "text" }}>{value}</div>
                    </Tippy>
                )}
            </Cell>
        </div>
    );
}
