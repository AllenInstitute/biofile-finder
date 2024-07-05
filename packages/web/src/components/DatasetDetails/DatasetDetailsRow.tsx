import classNames from "classnames";
import * as React from "react";

import Cell from "../../../../core/components/FileRow/Cell";

import styles from "./DatasetDetailsRow.module.css";

interface DatasetMetadataRowProps {
    className?: string;
    name: string;
    value: string;
    link?: string;
}

/**
 * Component responsible for rendering a dataset's metadata inside the dataset
 * details pane on right hand side of the application.
 */
export default function DatasetDetailsRow(props: DatasetMetadataRowProps) {
    return (
        <div className={classNames(props.className, styles.row)}>
            <Cell className={classNames(styles.cell, styles.key)} columnKey="key" width={1}>
                <span>{props.name}</span>
            </Cell>
            <Cell className={classNames(styles.cell, styles.value)} columnKey="value" width={1}>
                {props?.link ? (
                    <a href={props?.link} className={styles.link} target="_blank" rel="noreferrer">
                        {props.value}
                    </a>
                ) : (
                    <span>{props.value}</span>
                )}
            </Cell>
        </div>
    );
}
