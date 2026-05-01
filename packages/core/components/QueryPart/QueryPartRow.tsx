import { DirectionalHint, Icon } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import { TransparentIconButton, useButtonMenu } from "../Buttons";
import { DnDItem, DnDItemRendererParams } from "../DnDList/DnDList";
import Tooltip from "../Tooltip";

import styles from "./QueryPartRow.module.css";

export interface QueryPartRowItem extends DnDItem {
    description?: string;
    titleIconName?: string;
    uri?: string; // Full URI of the data source, used for tooltip and link
    onClick?: (itemId: string) => void;
    onDelete?: (itemId: string) => void;
    onRenderEditMenuList?: (item: QueryPartRowItem) => React.ReactElement<QueryPartRowItem>;
}

interface Props extends DnDItemRendererParams {
    item: QueryPartRowItem;
}

/**
 * Row within a query part that can be reordered and deleted
 */
export default function QueryGroupRow(props: Props) {
    const editMenu = useButtonMenu({
        shouldFocusOnMount: true,
        directionalHint: DirectionalHint.rightTopEdge,
        items: [{ key: "placeholder" }], // necessary to have a non-empty items list to have `onRenderMenuList` called
        onRenderMenuList: () => props.item.onRenderEditMenuList?.(props.item) as React.ReactElement,
    });

    const isInteractive = !!props.item.onClick || !props.item.disabled;
    const baseMargin = isInteractive ? 8 : 0;
    const marginLeft = props.item.disabled ? baseMargin : props.index * 16 + baseMargin;
    const isWebUrl =
        typeof props.item.uri === "string" &&
        (props.item.uri.startsWith("http://") || props.item.uri.startsWith("https://"));
    const hasExtraButton = isWebUrl || !!props.item.onRenderEditMenuList;

    return (
        <div
            className={classNames(styles.row, {
                [styles.grabbable]: !props.item.disabled,
                [styles.interactive]: isInteractive,
            })}
            style={{ marginLeft }}
        >
            <div
                className={classNames(styles.rowTitle, {
                    [styles.shortenedRowTitle]: hasExtraButton,
                    [styles.dynamicRowTitle]: !isInteractive,
                })}
                onClick={() => props.item.onClick?.(props.item.id)}
            >
                {props.item.titleIconName && (
                    <Icon className={styles.icon} iconName={props.item.titleIconName} />
                )}
                <Tooltip content={props.item.description || props.item.uri}>
                    <p>{props.item.title}</p>
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
            {isWebUrl && (
                <Tooltip content="Open data source URL">
                    <a
                        className={styles.linkIconButton}
                        href={props.item.uri}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Open data source URL in new tab"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Icon iconName="OpenInNewWindow" />
                    </a>
                </Tooltip>
            )}
            {props.item.onDelete && (
                <TransparentIconButton
                    className={styles.iconButton}
                    iconName="Cancel"
                    onClick={() => props.item.onDelete?.(props.item.id)}
                    title="Delete"
                />
            )}
        </div>
    );
}
