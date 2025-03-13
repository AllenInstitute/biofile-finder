import { IContextualMenuItem } from "@fluentui/react";
import { throttle } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { TertiaryButton } from "../Buttons";
import { ContextualMenuItemType } from "../ContextMenu";
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

    const fileFilters = useSelector(selection.selectors.getFileFilters);
    const isQueryingAicsFms = useSelector(selection.selectors.isQueryingAicsFms);
    const url = useSelector(selection.selectors.getEncodedFileExplorerUrl);

    const isEmptyQuery = !props.query.parts.sources.length;

    const onCopy = async () => {
        try {
            await navigator.clipboard.writeText(`https://biofile-finder.allencell.org/app?${url}`);
            dispatch(
                interaction.actions.processSuccess("linkCopySuccess", "Link copied to clipboard!")
            );
        } catch (error) {
            dispatch(
                interaction.actions.processError(
                    "linkCopyFailure",
                    "Failed to copy shareable link to clipboard"
                )
            );
        }
    };
    const shareQueryOptions: IContextualMenuItem[] = [
        {
            key: "Code snippet",
            text: "Code snippet",
            iconProps: { iconName: "Code" },
            onClick: () => {
                dispatch(interaction.actions.setVisibleModal(ModalType.CodeSnippet));
            },
        },
        {
            key: "Shareable link",
            text: "Shareable link",
            iconProps: { iconName: "Link" },
            title:
                "If you share this link, the recipient will be able to view the current query by importing it as a new query.",
            onClick: () => {
                onCopy();
            },
        },
    ];
    const deleteQueryOptions: IContextualMenuItem[] = [
        {
            key: "Delete",
            text: "Delete",
            onClick: props.onQueryDelete,
        },
    ];
    const saveQueryAsOptions: IContextualMenuItem[] = [
        {
            key: "Save query header",
            text: "DATA SOURCE TYPES",
            title: "Types of data sources available for export",
            itemType: ContextualMenuItemType.Header,
        },
        {
            key: "csv",
            text: "CSV",
            title: "Download a CSV containing the results of the current query",
            onClick() {
                dispatch(interaction.actions.showManifestDownloadDialog("csv", fileFilters));
            },
        },
        // Can't download JSON or Parquet files when querying AICS FMS
        ...(isQueryingAicsFms
            ? []
            : [
                  {
                      key: "json",
                      text: "JSON",
                      title: "Download a JSON file containing the result of the current query",
                      onClick() {
                          dispatch(
                              interaction.actions.showManifestDownloadDialog("json", fileFilters)
                          );
                      },
                  },
                  {
                      key: "parquet",
                      text: "Parquet",
                      title: "Download a Parquet file containing the result of the current query",
                      onClick() {
                          dispatch(
                              interaction.actions.showManifestDownloadDialog("parquet", fileFilters)
                          );
                      },
                  },
              ]),
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
            <TertiaryButton
                invertColor
                disabled={isEmptyQuery}
                iconName="Delete"
                menuItems={deleteQueryOptions}
                title="Delete query"
            />
            <TertiaryButton
                invertColor
                disabled={isEmptyQuery}
                iconName="Refresh"
                onClick={onRefresh}
                title="Refresh query"
            />
            <TertiaryButton
                invertColor
                disabled={isEmptyQuery}
                iconName="Copy"
                onClick={() => dispatch(selection.actions.addQuery(props.query))}
                title="Duplicate query"
            />
            <TertiaryButton
                invertColor
                disabled={isEmptyQuery}
                iconName="Save"
                menuItems={saveQueryAsOptions}
                title="Save query result as..."
            />
            <TertiaryButton
                invertColor
                disabled={isEmptyQuery}
                iconName="Share"
                id={Tutorial.SHARE_BUTTON_ID}
                menuItems={shareQueryOptions}
                onClick={onRefresh}
                title="Share query"
            />
        </div>
    );
}
