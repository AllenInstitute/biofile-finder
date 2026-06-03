import { IContextualMenuItem } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import ContentLengthToggle from "./ContentLengthToggle";
import { MetadataValue } from "../../../services/FileService";

import styles from "./Section.module.css";


interface Props {
    rowClassName?: string;
    row: React.ReactNode;
    childRows: Record<string, MetadataValue>[];
    children: React.ComponentType<{
        name: string;
        value: MetadataValue;
    }>;
    contextMenuItems?: IContextualMenuItem[];
}

/**
 * A collapsible group component for rendering nested metadata fields.
 * Supports label, expand/collapse functionality, and custom row components.
 */
export default function Section(props: Props) {
    const [isExpanded, setIsExpanded] = React.useState(true);

    return (
        <div className={styles.container}>
            <div className={classNames(styles.labelWithToggle, props.rowClassName)}>
                {props.childRows.length > 0 ? (
                    <ContentLengthToggle
                        isExpanded={isExpanded}
                        setIsExpanded={setIsExpanded}
                    />
                ) : (
                    <span className={styles.placeholderToggle} />
                )}
                {props.row}
            </div>

            {isExpanded && props.childRows.map((row, idx) => (
                <React.Fragment key={idx}>
                    {idx > 0 && <div className={styles.separator} />}
                    {Object.entries(row).map(([key, value]) =>
                        <props.children
                            key={key}
                            name={key}
                            value={value}
                        />
                    )}
                </React.Fragment>
            ))}
        </div>
    )
}
