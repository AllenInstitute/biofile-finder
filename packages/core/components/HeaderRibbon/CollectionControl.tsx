import {
    IButtonStyles,
    ContextualMenuItemType,
    IContextualMenuItem,
    Checkbox,
    IconButton,
} from "@fluentui/react";
import { orderBy } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { Dataset } from "../../services/DatasetService";
import { interaction, metadata, selection } from "../../state";
import { MENU_HEADER_STYLES } from "../ContextMenu/items";
import SearchableDropdown from "../SearchableDropdown";

const styles = require("./HeaderRibbon.module.css");

interface Props {
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

const ALL_FILES_KEY = "All of FMS";

const SECONDARY_BUTTON_STYLES: IButtonStyles = {
    label: {
        fontWeight: "normal",
    },
};

const SELECTED_STYLES: Partial<IContextualMenuItem> = {
    itemProps: {
        styles: {
            root: {
                // Color derived from background of selected dropdown item
                backgroundColor: "#EFEFEF",
            },
        },
    },
};

const FROZEN_COLLECTION_HEADER: IContextualMenuItem = {
    key: "fixed-collections",
    text: "Fixed Collections",
    title:
        "Fixed collections have files with immutable metadata, meaning they may not be up to date",
    itemType: ContextualMenuItemType.Header,
    itemProps: {
        styles: MENU_HEADER_STYLES,
    },
};

const LIVE_COLLECTION_HEADER: IContextualMenuItem = {
    key: "non-fixed-collections",
    text: "Non-Fixed Collections",
    title:
        "Non-fixed collections act as a filter to narrow the files in FMS down to a specific set",
    itemType: ContextualMenuItemType.Header,
    itemProps: {
        styles: MENU_HEADER_STYLES,
    },
};

/**
 * TODO
 */
export default function CollectionControl(props: Props) {
    const dispatch = useDispatch();
    const collections = useSelector(metadata.selectors.getActiveCollections);
    const selectedCollection = useSelector(selection.selectors.getSelectedCollection);

    const [searchValue, setSearchValue] = React.useState("");

    const collectionOptions = React.useMemo(() => {
        // Make "All Files" a data source option to represent
        // having no data source filter
        const ALL_FILES_OPTION: IContextualMenuItem = {
            text: ALL_FILES_KEY,
            key: ALL_FILES_KEY,
            onClick: () => {
                dispatch(selection.actions.changeCollection(undefined));
            },
            ...(!selectedCollection && SELECTED_STYLES),
        };

        const nameToCollectionMap = collections
            .filter((collection) => collection.name.toLowerCase().includes(searchValue))
            .reduce(
                (accum, collection) => ({
                    ...accum,
                    [collection.name]: orderBy(
                        [...(accum[collection.name] || []), collection],
                        "version",
                        "desc"
                    ),
                }),
                {} as { [name: string]: Dataset[] }
            );

        const frozenCollections: IContextualMenuItem[] = [];
        const liveCollections: IContextualMenuItem[] = [];
        Object.values(nameToCollectionMap).forEach((collectionsWithSameName) => {
            const option = {
                key: collectionsWithSameName[0].id,
                text: collectionsWithSameName[0].name,
                title: `Created ${new Date(
                    collectionsWithSameName[0].created
                ).toLocaleString()} by ${collectionsWithSameName[0].createdBy}`,
                subMenuProps:
                    collectionsWithSameName.length > 1
                        ? {
                              items: collectionsWithSameName.map((collection, index) => ({
                                  key: collection.id,
                                  text:
                                      index === 0
                                          ? `${collection.name} (Default - V${collection.version})`
                                          : `${collection.name} (V${collection.version})`,
                                  title: `Created ${new Date(
                                      collection.created
                                  ).toLocaleString()} by ${collection.createdBy}`,
                                  onClick: () => {
                                      dispatch(selection.actions.changeCollection(collection.id));
                                  },
                                  ...(collection.id === selectedCollection?.id && SELECTED_STYLES),
                              })),
                          }
                        : undefined,
                onClick: () => {
                    dispatch(selection.actions.changeCollection(collectionsWithSameName[0].id));
                },
                ...(collectionsWithSameName[0].id === selectedCollection?.id && SELECTED_STYLES),
            };
            if (collectionsWithSameName[0].fixed) {
                frozenCollections.push(option);
            } else {
                liveCollections.push(option);
            }
        });

        return [
            ALL_FILES_OPTION,
            ...(liveCollections.length ? [LIVE_COLLECTION_HEADER] : []),
            ...liveCollections,
            ...(frozenCollections.length ? [FROZEN_COLLECTION_HEADER] : []),
            ...frozenCollections,
        ];
    }, [collections, selectedCollection, searchValue, dispatch]);

    const collectionExportMenuOptions: IContextualMenuItem[] = [
        {
            key: "python",
            text: "Python Snippet",
            onClick: () => {
                selectedCollection &&
                    dispatch(interaction.actions.generatePythonSnippet(selectedCollection));
            },
        },
    ];

    return (
        <div className={styles.controlGroup}>
            <h5 className={styles.controlGroupLabel} onClick={props.onToggleCollapse}>
                Collection
            </h5>
            {!props.isCollapsed && (
                <div className={styles.controlGroupDisplay}>
                    <div className={styles.controlGroupInputGroup}>
                        <SearchableDropdown
                            className={styles.controlGroupDropdown}
                            options={collectionOptions}
                            selectedOption={selectedCollection?.name || ALL_FILES_KEY}
                            onSearch={setSearchValue}
                            searchValue={searchValue}
                        />
                        <div className={styles.controlGroupCheckboxGroup}>
                            <Checkbox
                                className={styles.controlGroupCheckbox}
                                disabled={!selectedCollection}
                                label="Private?"
                                checked={selectedCollection?.private}
                            />
                            <Checkbox
                                className={styles.controlGroupCheckbox}
                                disabled={!selectedCollection}
                                label="Fixed?"
                                checked={selectedCollection?.fixed}
                                styles={{
                                    root: {
                                        color: "white",
                                    },
                                    text: {
                                        color: "white",
                                    },
                                    label: {
                                        color: "white",
                                    },
                                    checkbox: {
                                        // Pulled from App.module.css
                                        backgroundColor: selectedCollection?.fixed
                                            ? "#bab5c9"
                                            : undefined,
                                    },
                                    checkmark: {
                                        color: "black",
                                    },
                                }}
                            />
                        </div>
                    </div>
                    <div className={styles.controlGroupButtons}>
                        <IconButton
                            className={styles.controlGroupButton}
                            disabled={!selectedCollection}
                            iconProps={{ iconName: "edit" }}
                            styles={SECONDARY_BUTTON_STYLES}
                            onClick={() => dispatch(interaction.actions.showEditCollectionDialog())}
                        />
                        <IconButton
                            className={styles.controlGroupButton}
                            iconProps={{ iconName: "export" }}
                            title="Export"
                            menuProps={{ items: collectionExportMenuOptions }}
                            disabled={!selectedCollection}
                            styles={SECONDARY_BUTTON_STYLES}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
