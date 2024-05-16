import { DirectionalHint, Icon, IconButton } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import Query from "./Query";
import { HELP_OPTIONS } from "./tutorials";
import { ModalType } from "../Modal";
import SvgIcon from "../SvgIcon";
import FileExplorerURL, { DEFAULT_AICS_FMS_QUERY } from "../../entity/FileExplorerURL";
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
    const queries = useSelector(selection.selectors.getQueries);
    const selectedQuery = useSelector(selection.selectors.getSelectedQuery);
    const isAicsEmployee = useSelector(interaction.selectors.isAicsEmployee);
    const dataSources = useSelector(interaction.selectors.getAllDataSources);
    const currentGlobalURL = useSelector(selection.selectors.getEncodedFileExplorerUrl);

    // Determine a default query to render or prompt the user for a data source
    // if no default is accessible
    React.useEffect(() => {
        if (!queries.length) {
            if (!window.location.search) {
                if (isAicsEmployee === true) {
                    // If the user is an AICS employee and there is no query in the URL, add a default query
                    dispatch(
                        selection.actions.addQuery({
                            name: "New AICS Query",
                            parts: DEFAULT_AICS_FMS_QUERY,
                        })
                    );
                } else if (isAicsEmployee === false) {
                    // If no query is selected and there is no query in the URL, prompt the user to select a data source
                    dispatch(interaction.actions.setVisibleModal(ModalType.DataSourcePrompt));
                }
            } else if (isAicsEmployee === undefined) {
                dispatch(
                    selection.actions.addQuery({
                        name: "New Query",
                        parts: FileExplorerURL.decode(window.location.search),
                    })
                );
            }
        }
    }, [isAicsEmployee, queries, dispatch]);

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
                            parts: { source },
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
                    dispatch(interaction.actions.setVisibleModal(ModalType.DataSourcePrompt));
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
                        className={styles.logo}
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
                        isSelected={query.name === selectedQuery}
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
