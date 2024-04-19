import {
    ContextualMenuItemType,
    DirectionalHint,
    Icon,
    IconButton,
    TextField,
} from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import Query from "./Query";
import { HELP_OPTIONS } from "./tutorials";
import { ModalType } from "../Modal";
import SvgIcon from "../SvgIcon";
import FileExplorerURL from "../../entity/FileExplorerURL";
import { interaction, metadata, selection } from "../../state";
import { AICS_LOGO } from "../../icons";

import styles from "./QuerySidebar.module.css";
import Tutorial from "../../entity/Tutorial";

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

    const isAICSEmployee = true; // TODO: Add trigger somewhere on app startup

    const [isExpanded, setIsExpanded] = React.useState(true);

    const helpMenuOptions = React.useMemo(() => HELP_OPTIONS(dispatch), [dispatch]);
    const addQueryOptions = React.useMemo(() => {
        const onEnterURL = (evt: React.FormEvent) => {
            evt.preventDefault();
            // Form submission typing on the TextField is yucky, so we'll just cast the event target
            const fileExplorerUrl = (evt.currentTarget as any)[0].value;
            dispatch(selection.actions.addQuery({ name: "New query", url: fileExplorerUrl }));
        };

        return [
            {
                key: "new-queries-section",
                itemType: ContextualMenuItemType.Section,
                sectionProps: {
                    bottomDivider: true,
                    title: "New Query",
                    items: [
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
                    ],
                },
            },
            {
                key: "Import from URL",
                text: "Import from URL",
                iconProps: { iconName: "Import" },
                subMenuProps: {
                    className: styles.buttonMenu,
                    items: [{ key: "placeholder" }],
                    onRenderMenuList: () => (
                        <form className={styles.importForm} onSubmit={onEnterURL}>
                            <TextField
                                placeholder="Paste URL here..."
                                iconProps={{ iconName: "ReturnKey" }}
                            />
                        </form>
                    ),
                },
            },
        ];
    }, [dispatch, collections, isAICSEmployee]);

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
