import { DirectionalHint, Icon } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import useSizeSpecificPrefix, { buildPrefix } from "./useSizeSpecificPrefix";
import { TransparentIconButton, useButtonMenu } from "../Buttons";
import { DnDItem, DnDItemRendererParams } from "../DnDList/DnDList";
import Tooltip from "../Tooltip";

import styles from "./QueryPartRow.module.css";

export interface QueryPartRowItem extends DnDItem {
    description?: string;
    datasetDescriptionSource?: string;
    titleIconName?: string;
    /**
     * Ancestor path segments shown as a greyed breadcrumb before the title (the leaf). E.g. for
     * "Well.Dose.Solution.Name" this is ["Well", "Dose", "Solution"] and the title is "Name".
     * As space tightens we drop whole parents from the front, prefixing "…" (see useSizeSpecificPrefix).
     */
    titlePrefixParts?: string[];
    onClick?: (itemId: string) => void;
    onDelete?: (itemId: string) => void;
    onShowDatasetInfo?: (itemId: string) => void;
    onRenderEditMenuList?: (item: QueryPartRowItem) => React.ReactElement<QueryPartRowItem>;
}

interface Props extends DnDItemRendererParams {
    item: QueryPartRowItem;
}

/**
 * Row within a query part that can be reordered and deleted
 */
export default function QueryGroupRow(props: Props) {
    const prefixParts = props.item.titlePrefixParts ?? [];
    const hasPrefix = prefixParts.length > 0;
    const { prefix, rowTitleRef, iconRef, probeRef, leafProbeRef } = useSizeSpecificPrefix(
        prefixParts,
        props.item.title
    );

    const editMenu = useButtonMenu({
        shouldFocusOnMount: true,
        directionalHint: DirectionalHint.rightTopEdge,
        items: [{ key: "placeholder" }], // necessary to have a non-empty items list to have `onRenderMenuList` called
        onRenderMenuList: () => props.item.onRenderEditMenuList?.(props.item) as React.ReactElement,
    });

    const isInteractive = !!props.item.onClick || !props.item.disabled;
    const baseMargin = isInteractive ? 8 : 0;
    const marginLeft = props.item.disabled ? baseMargin : props.index * 16 + baseMargin;

    const prefixText = prefixParts.length ? `${prefixParts.join(" : ")} : ` : "";
    const tooltip = `${prefixText}${props.item.title}\n${props.item.description ?? ""}`;

    return (
        <div
            className={classNames(styles.row, {
                [styles.grabbable]: !props.item.disabled,
                [styles.interactive]: isInteractive,
            })}
            style={{
                marginLeft,
                maxWidth: marginLeft ? `calc(100% - ${marginLeft + 8}px)` : undefined,
            }}
        >
            <div
                ref={rowTitleRef}
                className={classNames(styles.rowTitle, {
                    [styles.shortenedRowTitle]: !!props.item.onRenderEditMenuList,
                    [styles.dynamicRowTitle]: !isInteractive,
                })}
                onClick={() => props.item.onClick?.(props.item.id)}
            >
                {props.item.titleIconName && (
                    <span ref={iconRef} className={styles.iconWrap}>
                        <Icon className={styles.icon} iconName={props.item.titleIconName} />
                    </span>
                )}
                <Tooltip content={tooltip} hostClassName={styles.rowTooltip}>
                    <p className={styles.titleLine}>
                        {hasPrefix && prefix !== null && (
                            <span className={styles.titlePrefix}>{prefix}</span>
                        )}
                        {hasPrefix ? (
                            // Necessary to nest to apply reading order under certain conditions
                            <span className={classNames(styles.titleLeaf, styles.titleLeafNested)}>
                                <span className={styles.titlePrefixInner}>{props.item.title}</span>
                            </span>
                        ) : (
                            <span className={styles.titleLeaf}>{props.item.title}</span>
                        )}
                        {/* Hidden probes: one per "keep N trailing parents" candidate, plus the leaf,
                            measured to choose how many parents fit. */}
                        {hasPrefix && (
                            <span className={styles.measureProbeContainer} aria-hidden="true">
                                {prefixParts.map((_, i) => {
                                    const kept = i + 1;
                                    return (
                                        <span
                                            key={kept}
                                            ref={probeRef(kept)}
                                            className={styles.titlePrefix}
                                        >
                                            {buildPrefix(prefixParts, kept)}
                                        </span>
                                    );
                                })}
                                <span ref={probeRef(0)} className={styles.titlePrefix}>
                                    {buildPrefix(prefixParts, 0)}
                                </span>
                                <span ref={leafProbeRef}>{props.item.title}</span>
                            </span>
                        )}
                    </p>
                </Tooltip>
            </div>
            {!!props.item.onRenderEditMenuList && (
                <TransparentIconButton
                    className={classNames(styles.iconButton, styles.hiddenInnerIcon)}
                    iconName="Edit"
                    menuProps={editMenu}
                    title="Edit"
                />
            )}
            {props.item.onDelete && (
                <TransparentIconButton
                    className={styles.iconButton}
                    iconName="Cancel"
                    onClick={() => props.item.onDelete?.(props.item.id)}
                    title="Delete"
                />
            )}
            {props.item.onShowDatasetInfo && !!props.item.datasetDescriptionSource && (
                <TransparentIconButton
                    className={styles.iconButton}
                    disabled // TO DO: enable in follow-up when we have the UI component
                    iconName="Info"
                    onClick={() => props.item.onShowDatasetInfo?.(props.item.id)}
                    title={`Data source info from ${props.item.datasetDescriptionSource}`}
                />
            )}
        </div>
    );
}
