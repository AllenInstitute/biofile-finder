import { IContextualMenuItem } from "@fluentui/react";
import classNames from "classnames";
import { noop } from "lodash";
import * as React from "react";

import ContentLengthToggle from "./ContentLengthToggle";
import SectionEntries from "./SectionEntries";
import { MetadataValue } from "../../../services/FileService";

import styles from "./Section.module.css";

/** Renders one metadata field (key/value) within a section. */
export type SectionRowRenderer = React.ComponentType<{
    name: string;
    value: MetadataValue;
}>;

interface Props {
    childRows: Record<string, MetadataValue>[];
    children: SectionRowRenderer;
    contextMenuItems?: IContextualMenuItem[];
    /** Controlled collapsed state. Defaults to false when not provided. */
    isCollapsed?: boolean;
    /** Called when the user toggles the expand/collapse button. */
    onToggle?: () => void;
    row: React.ReactNode;
    rowClassName?: string;
    entryLabel?: string;
}

/**
 * A collapsible group component for rendering nested metadata fields.
 * Supports label, expand/collapse functionality, and custom row components.
 */
export default function Section(props: Props) {
    const isCollapsed = props.isCollapsed ?? false;
    const onToggle = props.onToggle ?? noop;

    return (
        <div className={styles.container}>
            <div className={classNames(styles.labelWithToggle, props.rowClassName)}>
                {props.childRows.length > 0 ? (
                    <ContentLengthToggle
                        isCollapsed={isCollapsed}
                        setIsCollapsed={() => onToggle()}
                    />
                ) : (
                    <span className={styles.placeholderToggle} />
                )}
                {props.row}
            </div>

            {!isCollapsed && (
                <SectionEntries
                    childRows={props.childRows}
                    entryLabel={props.entryLabel}
                    renderer={props.children}
                />
            )}
        </div>
    );
}
