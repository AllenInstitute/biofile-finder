import { DirectionalHint, Icon, IconButton } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import Query from "./Query";
import { HELP_OPTIONS } from "./tutorials";
import { ModalType } from "../Modal";
import SvgIcon from "../SvgIcon";
import Tutorial from "../../entity/Tutorial";
import { interaction, selection } from "../../state";
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
    const isOnWeb = useSelector(interaction.selectors.isOnWeb);
    const queries = useSelector(selection.selectors.getQueries);
    const selectedQuery = useSelector(selection.selectors.getSelectedQuery);
    const dataSources = useSelector(interaction.selectors.getAllDataSources);
    const currentGlobalURL = useSelector(selection.selectors.getEncodedFileExplorerUrl);

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

    const helpMenuOptions = React.useMemo(() => HELP_OPTIONS(dispatch), [dispatch]);
    const addQueryOptions = React.useMemo(
        () => [
            ...dataSources.map((source) => ({
                key: source.id,
                text: source.name,
                iconProps: { iconName: "Folder" },
                onClick: () => {
                    dispatch(
                        selection.actions.addQuery({
                            name: `New ${source.name} query`,
                            parts: { sources: [source] },
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
                    dispatch(interaction.actions.setVisibleModal(ModalType.DataSource));
                },
            },
        ],
        [dispatch, dataSources]
    );

    if (!isExpanded) {
        return (
            <div className={styles.minimizedContainer} onClick={() => setIsExpanded(true)}>
                <div className={styles.header}>
                    <SvgIcon
                        height={25}
                        pathData={AICS_LOGO}
                        viewBox="0,0,512,512"
                        width={25}
                        className={classNames(styles.logo, {
                            [styles.logoHidden]: isOnWeb,
                        })}
                    />
                </div>
                <p>
                    <strong>{selectedQuery}</strong>
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
                    className={classNames(styles.logo, {
                        [styles.logoHidden]: isOnWeb,
                    })}
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
                {queries.length ? (
                    queries.map((query) => (
                        <Query
                            key={query.name}
                            isSelected={query.name === selectedQuery}
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
