import { DirectionalHint, IconButton } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import { DnDItem, DnDItemRendererParams } from "../DnDList/DnDList";

import styles from "./QueryPartRow.module.css";

export interface QueryPartRowItem extends DnDItem {
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
    return (
        <div
            className={classNames(styles.row, { [styles.grabbable]: !props.item.disabled })}
            style={{ marginLeft: props.item.disabled ? 0 : props.index * 10 }}
        >
            <div
                className={classNames(styles.rowTitle, {
                    [styles.shortenedRowTitle]: !!props.item.onRenderEditMenuList,
                })}
            >
                {!props.item.disabled && (
                    <IconButton
                        ariaDescription="Move up or down in order"
                        ariaLabel="Move"
                        className={classNames(styles.iconButton, styles.grabbable)}
                        iconProps={{ iconName: "NumberedListText" }}
                    />
                )}
                <p title={props.item.title}>{props.item.title}</p>
            </div>
            {!!props.item.onRenderEditMenuList && (
                <IconButton
                    ariaLabel="Edit"
                    className={classNames(styles.iconButton, styles.hiddenInnerIcon)}
                    iconProps={{ iconName: "Edit" }}
                    menuProps={{
                        isSubMenu: true,
                        directionalHint: DirectionalHint.rightTopEdge,
                        shouldFocusOnMount: true,
                        items: [{ key: "placeholder" }], // necessary to have a non-empty items list to have `onRenderMenuList` called
                        onRenderMenuList: () =>
                            props.item.onRenderEditMenuList?.(props.item) as React.ReactElement,
                    }}
                />
            )}
            {props.item.onDelete && (
                <IconButton
                    ariaDescription="Delete"
                    ariaLabel="Delete"
                    className={styles.iconButton}
                    iconProps={{ iconName: "Cancel" }}
                    onClick={() => props.item.onDelete?.(props.item.id)}
                />
            )}
        </div>
    );
}
