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
                    [styles.shortenedRowTitle]: !!props.item.onRenderEditMenuList,
                    [styles.dynamicRowTitle]: !isInteractive,
                })}
                onClick={() => props.item.onClick?.(props.item.id)}
            >
                {props.item.titleIconName && (
                    <Icon className={styles.icon} iconName={props.item.titleIconName} />
                )}
                <Tooltip content={props.item.description}>
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
