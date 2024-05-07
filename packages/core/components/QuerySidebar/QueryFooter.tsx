import { IContextualMenuItem, IconButton } from "@fluentui/react";
import classNames from "classnames";
import { throttle } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ModalType } from "../Modal";
import Tutorial from "../../entity/Tutorial";
import { interaction, selection } from "../../state";
import { Query } from "../../state/selection/actions";

import styles from "./QueryFooter.module.css";

interface Props {
    isDeletable?: boolean;
    onQueryDelete: () => void;
    query: Query;
}

/**
 * Footer for a query in the QuerySidebar, used for displaying options available for a query.
 */
export default function QueryFooter(props: Props) {
    const dispatch = useDispatch();

    const url = useSelector(selection.selectors.getEncodedFileExplorerUrl);

    const onCopy = async () => {
        try {
            navigator.clipboard.writeText(url);
            window.alert("Link copied to clipboard!");
        } catch (error) {
            window.alert("Failed to copy shareable link to clipboard");
        }
    };
    const shareQueryOptions: IContextualMenuItem[] = [
        {
            key: "Code Snippet",
            text: "Code Snippet",
            iconProps: { iconName: "Code" },
            onClick: () => {
                dispatch(interaction.actions.setVisibleModal(ModalType.CodeSnippet));
            },
        },
        {
            key: "Shareable Link",
            text: "Shareable Link",
            iconProps: { iconName: "Link" },
            title:
                "If you share this link, the recipient will be able to view the current query by importing it as a new query.",
            onClick: () => {
                onCopy();
            },
        },
    ];

    const onRefresh = throttle(
        () => {
            dispatch(interaction.actions.refresh());
        },
        100000,
        { trailing: false }
    );

    return (
        <div className={styles.container}>
            <IconButton
                ariaDescription="Share query"
                ariaLabel="Share"
                className={styles.button}
                menuProps={{ className: styles.buttonMenu, items: shareQueryOptions }}
                iconProps={{ iconName: "Share" }}
                id={Tutorial.SHARE_BUTTON_ID}
            />
            <IconButton
                ariaDescription="Refresh query"
                ariaLabel="Refresh"
                className={styles.button}
                onClick={onRefresh}
                iconProps={{ iconName: "Refresh" }}
            />
            <IconButton
                ariaDescription="Copy query"
                ariaLabel="Copy"
                className={styles.button}
                onClick={() => dispatch(selection.actions.addQuery(props.query))}
                iconProps={{ iconName: "Copy" }}
            />
            <IconButton
                ariaDescription="Delete query"
                ariaLabel="Delete"
                className={classNames(styles.button, { [styles.disabled]: !props.isDeletable })}
                disabled={!props.isDeletable}
                onClick={props.onQueryDelete}
                iconProps={{ iconName: "Delete" }}
            />
        </div>
    );
}
