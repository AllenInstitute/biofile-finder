import { IContextualMenuItem } from "@fluentui/react";
import { throttle } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { TertiaryButton } from "../Buttons";
import { ModalType } from "../Modal";
import Tooltip from "../Tooltip";
import Tutorial from "../../entity/Tutorial";
import FileFilter from "../../entity/FileFilter";
import IncludeFilter from "../../entity/FileFilter/IncludeFilter";
import FileSet from "../../entity/FileSet";
import useSaveMetadataOptions from "../../hooks/useSaveMetadataOptions";
import { interaction, selection } from "../../state";
import { Query } from "../../state/selection/actions";

import styles from "./QueryFooter.module.css";

const MAX_MANIFEST_FILE_COUNT = 250000;

interface Props {
    isDeletable?: boolean;
    onQueryDelete: () => void;
    query: Query;
    filters: FileFilter[];
    groups: string[];
}

/**
 * Footer for a query in the QuerySidebar, used for displaying options available for a query.
 */
export default function QueryFooter(props: Props) {
    const dispatch = useDispatch();

    const url = useSelector(selection.selectors.getEncodedSearchParams);
    const fileService = useSelector(interaction.selectors.getFileService);
    const [totalFileCount, setTotalFileCount] = React.useState(0);
    const combinedFilters = React.useMemo(() => {
        const groupByFilters = props.groups.map(
            (annotationName) => new IncludeFilter(annotationName)
        );
        return [...props.filters, ...groupByFilters];
    }, [props.filters, props.groups]);
    const totalFileSet = React.useMemo(() => {
        return new FileSet({
            fileService,
            filters: combinedFilters,
        });
    }, [fileService, combinedFilters]);

    // Get a count of all files
    React.useEffect(() => {
        totalFileSet
            .fetchTotalCount()
            .then((count) => {
                setTotalFileCount(count);
            })
            .catch((err) => {
                // Data source may not be prepared if the data source is taking longer to load
                // than the component does to render. In this case, we can ignore the error.
                // The component will re-render when the data source is prepared.
                if (!err?.message.includes("Data source is not prepared")) {
                    throw err;
                }
            });
    }, [totalFileSet, setTotalFileCount]);

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
                dispatch(interaction.actions.setVisibleModal(ModalType.QueryCodeSnippet));
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
    const saveQueryAsOptions = useSaveMetadataOptions(combinedFilters, true);

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
            <Tooltip
                content={
                    totalFileCount > MAX_MANIFEST_FILE_COUNT
                        ? "Unable to save full result for >250,000 files"
                        : undefined
                }
            >
                <TertiaryButton
                    invertColor
                    disabled={isEmptyQuery || totalFileCount > MAX_MANIFEST_FILE_COUNT}
                    iconName="Save"
                    menuItems={saveQueryAsOptions}
                    title="Save query result as..."
                />
            </Tooltip>
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
