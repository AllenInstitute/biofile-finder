import {
    ContextualMenuItemType,
    DirectionalHint,
    IContextualMenuItem,
    Icon,
    IconButton,
} from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import Query from "./Query";
import { PrimaryButton, useButtonMenu } from "../Buttons";
import { ModalType } from "../Modal";
import Tooltip from "../Tooltip";
import { AICS_FMS_DATA_SOURCE_NAME } from "../../constants";
import { DEFAULT_AICS_FMS_QUERY } from "../../entity/SearchParams";
import Tutorial from "../../entity/Tutorial";
import useHelpOptions from "../../hooks/useHelpOptions";
import { interaction, selection } from "../../state";

import styles from "./QuerySidebar.module.css";

interface QuerySidebarProps {
    className?: string;
}

/**
 * Sidebar for managing queries. Contains a list of queries and options for creating new queries.
 */
export default function QuerySidebar(props: QuerySidebarProps) {
    const dispatch = useDispatch();
    const isOnWeb = useSelector(interaction.selectors.isOnWeb);
    const queries = useSelector(selection.selectors.getQueries);
    const selectedQuery = useSelector(selection.selectors.getSelectedQuery);
    const dataSources = useSelector(interaction.selectors.getAllDataSources);
    const currentGlobalURL = useSelector(selection.selectors.getEncodedSearchParams);

    const helpMenuOptions = useHelpOptions(dispatch);
    const helpMenu = useButtonMenu({
        items: helpMenuOptions,
        directionalHint: DirectionalHint.topRightEdge,
    });

    React.useEffect(() => {
        if (selectedQuery) {
            const newurl =
                window.location.protocol +
                "//" +
                window.location.host +
                window.location.pathname +
                "?" +
                currentGlobalURL;
            window.history.pushState({ path: newurl }, "", newurl);
        }
    }, [currentGlobalURL, selectedQuery]);

    const [isExpanded, setIsExpanded] = React.useState(true);

    const addQueryOptions: IContextualMenuItem[] = React.useMemo(
        () => [
            {
                key: "ADD NEW QUERY",
                text: "ADD NEW QUERY",
                itemType: ContextualMenuItemType.Header,
            },
            {
                key: "add-query-divider",
                itemType: ContextualMenuItemType.Divider,
            },
            ...dataSources.map((source) => ({
                key: source.id,
                text: source.name,
                iconProps: { iconName: "Folder" },
                onClick: () => {
                    dispatch(
                        selection.actions.addQuery({
                            name: `New ${source.name} query`,
                            parts:
                                source.name === AICS_FMS_DATA_SOURCE_NAME
                                    ? DEFAULT_AICS_FMS_QUERY
                                    : { sources: [source] },
                        })
                    );
                },
            })),
            {
                key: "New data source",
                text: "New data source",
                iconProps: { iconName: "NewFolder" },
                onClick: () => {
                    dispatch(interaction.actions.setVisibleModal(ModalType.DataSource));
                },
            },
        ],
        [dispatch, dataSources]
    );

    if (!isExpanded) {
        return (
            <div className={styles.minimizedContainer} onClick={() => setIsExpanded(true)}>
                <p>
                    Query Panel
                    <Icon
                        iconName={"ChevronLeftSmall"}
                        className={styles.minimizedContainerExpand}
                    />
                </p>
            </div>
        );
    }

    return (
        <div
            className={classNames(props.className, styles.container, {
                [styles.emptyFooter]: isOnWeb,
            })}
        >
            <div className={styles.header}>
                <PrimaryButton
                    className={styles.addButton}
                    id={Tutorial.ADD_QUERY_BUTTON_ID}
                    iconName="Add"
                    menuItems={addQueryOptions}
                    title="Add new query"
                    text="Add"
                />
            </div>
            <div
                className={styles.queriesContainer}
                data-is-scrollable="true"
                data-is-focusable="true"
            >
                {queries.length ? (
                    queries.map((query) => (
                        <Query
                            key={query.name}
                            isSelected={query.name === selectedQuery || queries.length === 1}
                            query={query}
                        />
                    ))
                ) : (
                    <Query
                        isSelected
                        query={{
                            name: "New Query",
                            parts: { hierarchy: [], filters: [], sources: [], openFolders: [] },
                        }}
                    />
                )}
            </div>
            <div className={classNames(styles.footer, { [styles.hidden]: isOnWeb })}>
                <Tooltip content="Help menu">
                    <IconButton
                        ariaLabel="Help"
                        className={styles.helpButton}
                        iconProps={{ iconName: "Help" }}
                        menuIconProps={{ iconName: "ChevronUp" }}
                        menuProps={helpMenu}
                    />
                </Tooltip>
            </div>
            <div className={styles.minimizeBar} onClick={() => setIsExpanded(false)}>
                <Icon iconName={"ChevronLeftSmall"} />
            </div>
        </div>
    );
}
