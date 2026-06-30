import { isNil, isObject } from "lodash";
import * as React from "react";

import Section, { SectionRowRenderer } from "./Section";
import { MetadataValue } from "../../../services/FileService";

import styles from "./SectionEntries.module.css";

interface Props {
    childRows: Record<string, MetadataValue>[];
    entryLabel?: string;
    renderer: SectionRowRenderer;
}

/**
 * Renders a section's entries. A section whose value is an array of more than one object entry
 * (e.g. multiple "Treatment" records) wraps each entry in its own collapsible sub-section
 * labeled "<entryLabel> entry <n>", mirroring how the top-level sections collapse. A single
 * entry (or no entryLabel) renders inline.
 */
export default function SectionEntries(props: Props) {
    // Per-entry collapse is local UI state — entries are a leaf grouping, so it need not live
    // in the shared collapsed-sections map the way section/row collapse does.
    const [collapsedEntries, setCollapsedEntries] = React.useState<ReadonlySet<number>>(new Set());
    const toggleEntry = (idx: number) =>
        setCollapsedEntries((prev) => {
            const next = new Set(prev);
            next.has(idx) ? next.delete(idx) : next.add(idx);
            return next;
        });

    if (props.childRows.length <= 1 || !props.entryLabel) {
        return (
            <>
                {props.childRows.map((row, idx) => (
                    <SortedSectionEntry key={idx} row={row} renderer={props.renderer} />
                ))}
            </>
        );
    }

    return (
        <>
            {props.childRows.map((entry, idx) => (
                // A single-entry Section renders the entry's rows inline; here it just adds the
                // labeled, collapsible header for one entry.
                <Section
                    key={idx}
                    row={
                        <span className={styles.entryTitle}>{`${props.entryLabel} entry ${
                            idx + 1
                        }`}</span>
                    }
                    childRows={[entry]}
                    isCollapsed={collapsedEntries.has(idx)}
                    onToggle={() => toggleEntry(idx)}
                >
                    {props.renderer}
                </Section>
            ))}
        </>
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
    renderer: SectionRowRenderer;
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
