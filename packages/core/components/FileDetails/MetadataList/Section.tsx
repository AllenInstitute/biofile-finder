import { IContextualMenuItem } from "@fluentui/react";
import classNames from "classnames";
import { isNil, isObject } from "lodash";
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
                    <ContentLengthToggle isExpanded={isExpanded} setIsExpanded={setIsExpanded} />
                ) : (
                    <span className={styles.placeholderToggle} />
                )}
                {props.row}
            </div>

            {isExpanded &&
                props.childRows.map((row, idx) => (
                    <React.Fragment key={idx}>
                        {idx > 0 && <div className={styles.separator} />}
                        <SortedSectionEntry row={row} renderer={props.children} />
                    </React.Fragment>
                ))}
        </div>
    );
}

/**
 * Helper component to render section entries sorted by:
 * 1) If the key represents primitive values vs nested values (primitive values first, then nested values)
 * 2) Alphabetical order of the keys
 */
const collator = new Intl.Collator("en");
function SortedSectionEntry(props: {
    row: Record<string, MetadataValue>;
    renderer: Props["children"];
}) {
    return (
        <>
            {Object.entries(props.row)
                .sort(([keyA, arrayA], [keyB, arrayB]) => {
                    const valueA = arrayA.length > 0 ? arrayA[0] : undefined;
                    const valueB = arrayB.length > 0 ? arrayB[0] : undefined;
                    const isGroupA = !isNil(valueA) && isObject(valueA);
                    const isGroupB = !isNil(valueB) && isObject(valueB);
                    if (!isGroupA && isGroupB) return -1;
                    if (isGroupA && !isGroupB) return 1;
                    return collator.compare(keyA, keyB);
                })
                .map(([key, value]) => (
                    <props.renderer key={key} name={key} value={value} />
                ))}
        </>
    );
}
