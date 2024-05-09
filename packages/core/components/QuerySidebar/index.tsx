import {
    DirectionalHint,
    Icon,
    IconButton,
} from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import Query from "./Query";
import { HELP_OPTIONS } from "./tutorials";
import { ModalType } from "../Modal";
import SvgIcon from "../SvgIcon";
import FileExplorerURL from "../../entity/FileExplorerURL";
import Tutorial from "../../entity/Tutorial";
import { interaction, metadata, selection } from "../../state";
import { AICS_LOGO } from "../../icons";

import styles from "./QuerySidebar.module.css";

interface QuerySidebarProps {
    className?: string;
}

/**
 * Sidebar for managing queries. Contains a list of queries and options for creating new queries.
 */
export default function QuerySidebar(props: QuerySidebarProps) {
    const dispatch = useDispatch();
    const queries = useSelector(selection.selectors.getQueries);
    const collections = useSelector(metadata.selectors.getCollections);
    const selectedQuery = useSelector(selection.selectors.getSelectedQuery);

    // TODO: Add trigger somewhere on app startup before releasing to public
    const isAICSEmployee = true;

    const [isExpanded, setIsExpanded] = React.useState(true);

    // Default to first query in array if none selected yet some available
    // this is primarily useful for when loading queries from persisted state
    React.useEffect(() => {
        if (queries.length && !selectedQuery) {
            dispatch(selection.actions.changeQuery(queries[0]));
        }
    }, [queries, selectedQuery, dispatch]);

    const helpMenuOptions = React.useMemo(() => HELP_OPTIONS(dispatch), [dispatch]);
    const addQueryOptions = React.useMemo(() => ([
        ...(isAICSEmployee
            ? [
                    {
                        key: "AICS FMS",
                        text: "AICS FMS",
                        iconProps: { iconName: "Database" },
                        onClick: () => {
                            dispatch(
                                selection.actions.addQuery({
                                    name: "New AICS Query",
                                    url: FileExplorerURL.DEFAULT_FMS_URL,
                                })
                            );
                        },
                        secondaryText: "Data Source",
                    },
                ]
            : []),
        ...collections
            .filter((collection) => !!collection.uri)
            .map((collection) => ({
                key: collection.id,
                text: `${
                    collection.name
                } (${collection.created.toLocaleDateString()})`,
                iconProps: { iconName: "Folder" },
                onClick: () => {
                    dispatch(
                        selection.actions.addQuery({
                            name: `New ${collection.name} query`,
                            url: collection.uri as string,
                        })
                    );
                },
                secondaryText: "Data Source",
            })),
        {
            key: "New Data Source...",
            text: "New Data Source...",
            iconProps: { iconName: "NewFolder" },
            onClick: () => {
                dispatch(
                    interaction.actions.setVisibleModal(ModalType.DataSourcePrompt)
                );
            },
        },
    ]), [dispatch, collections, isAICSEmployee]);

    if (!isExpanded) {
        return (
            <div className={styles.minimizedContainer} onClick={() => setIsExpanded(true)}>
                <div className={styles.header}>
                    <SvgIcon
                        height={25}
                        pathData={AICS_LOGO}
                        viewBox="0,0,512,512"
                        width={25}
                        className={styles.logo}
                    />
                </div>
                <p>
                    <strong>{selectedQuery?.name}</strong>
                </p>
            </div>
        );
    }

    return (
        <div className={classNames(props.className, styles.container)}>
            <div className={styles.header}>
                <SvgIcon
                    height={40}
                    pathData={AICS_LOGO}
                    viewBox="0,0,512,512"
                    width={40}
                    className={styles.logo}
                />
                <IconButton
                    ariaLabel="Add"
                    className={styles.addViewButton}
                    iconProps={{ iconName: "Add" }}
                    id={Tutorial.ADD_QUERY_BUTTON_ID}
                    menuIconProps={{ iconName: "ChevronRight" }}
                    menuProps={{
                        className: styles.buttonMenu,
                        directionalHint: DirectionalHint.rightTopEdge,
                        shouldFocusOnMount: true,
                        items: addQueryOptions,
                    }}
                />
            </div>
            <div
                className={styles.queriesContainer}
                data-is-scrollable="true"
                data-is-focusable="true"
            >
                {queries.map((query) => (
                    <Query
                        key={query.name}
                        isSelected={query.name === selectedQuery?.name}
                        query={query}
                    />
                ))}
            </div>
            <div className={styles.footer}>
                <IconButton
                    ariaLabel="Help"
                    iconProps={{ iconName: "Help" }}
                    title="Help tutorials"
                    menuIconProps={{ iconName: "ChevronUp" }}
                    menuProps={{ className: styles.buttonMenu, items: helpMenuOptions }}
                />
            </div>
            <div className={styles.minimizeBar} onClick={() => setIsExpanded(false)}>
                <Icon iconName="DoubleChevronLeft" />
                <Icon iconName="DoubleChevronLeft" />
                <Icon iconName="DoubleChevronLeft" />
                <Icon iconName="DoubleChevronLeft" />
                <Icon iconName="DoubleChevronLeft" />
                <Icon iconName="DoubleChevronLeft" />
                <Icon iconName="DoubleChevronLeft" />
            </div>
        </div>
    );
}
