import {
    IButtonStyles,
    ContextualMenuItemType,
    IContextualMenuItem,
    IconButton,
    IContextualMenuItemProps,
    TooltipHost,
    IStyle,
} from "@fluentui/react";
import { orderBy } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Dispatch } from "redux";

import { Dataset } from "../../services/DatasetService";
import { interaction, metadata, selection } from "../../state";
import SearchableDropdown from "../SearchableDropdown";

const styles = require("./HeaderRibbon.module.css");

interface Props {
    className?: string;
    isCollapsed?: boolean;
    onCollapse: () => void;
    selectedCollection?: Dataset;
}

const ALL_FILES_KEY = "All of FMS";

const SECONDARY_BUTTON_STYLES: IButtonStyles = {
    label: {
        fontWeight: "normal",
    },
};

const MENU_STYLES: IStyle = {
    // Color is lightened tint of --primary-brand-dark-blue defined in App.module.css
    backgroundColor: "#1A4A71",
    color: "white",
    ":hover": {
        // Equivalent to --primary-brand-dark-blue defined in App.module.css
        backgroundColor: "#003057",
        color: "white",
    },
    ":active": {
        // Equivalent to --primary-brand-dark-blue defined in App.module.css
        backgroundColor: "#003057",
        color: "white",
    },
};

const DEFAULT_OPTION_PROPS: Partial<IContextualMenuItemProps> = {
    styles: {
        label: {
            color: "white",
        },
        divider: MENU_STYLES,
        splitMenu: MENU_STYLES,
        splitPrimary: MENU_STYLES,
        item: MENU_STYLES,
        root: MENU_STYLES,
        subMenuIcon: { ...MENU_STYLES, width: "28px" },
    },
};

const SELECTED_OPTION_PROPS: Partial<IContextualMenuItemProps> = {
    styles: {
        root: {
            // Equivalent to --primary-brand-dark-blue defined in App.module.css
            backgroundColor: "#003057",
            color: "white",
            ":hover": {
                backgroundColor: "#003057",
                color: "white",
            },
            ":active": {
                backgroundColor: "#003057",
                color: "white",
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
    itemProps: DEFAULT_OPTION_PROPS,
};

const LIVE_COLLECTION_HEADER: IContextualMenuItem = {
    key: "non-fixed-collections",
    text: "Non-Fixed Collections",
    title:
        "Non-fixed collections act as a filter to narrow the files in FMS down to a specific set",
    itemType: ContextualMenuItemType.Header,
    itemProps: DEFAULT_OPTION_PROPS,
};

const IS_FIXED_TOOLTIP =
    'If fixed, the collection is an immutable, point-in-time snapshot of the metadata for the files you’ve selected (a "dataset"). No files have been added to or removed from the collection, nor has the files\' metadata been modified since creation of the collection.';
const IS_PRIVATE_TOOLTIP =
    "If private, this collection will not appear in the collection dropdown for users other than the creator's as an option by default. However, the collection can still be sent as part of a FMS File Explorer URL.";

function convertCollectionToOption(
    collection: Dataset,
    dispatch: Dispatch,
    selectedCollection?: Dataset
): IContextualMenuItem {
    return {
        key: collection.id,
        text: collection.name,
        title: `Created ${new Date(collection.created).toLocaleString()} by ${
            collection.createdBy
        }`,
        onClick: () => {
            dispatch(selection.actions.changeCollection(collection));
        },
        itemProps:
            collection.id !== selectedCollection?.id ? DEFAULT_OPTION_PROPS : SELECTED_OPTION_PROPS,
    };
}

/**
 * Form group for controlling the file collection all file queries
 * are run against. Includes display for current collection as well
 * as various ways to interact with collections.
 */
export default function CollectionControl(props: Props) {
    const { selectedCollection } = props;
    const dispatch = useDispatch();
    const collections = useSelector(metadata.selectors.getActiveCollections);

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
            itemProps: selectedCollection ? DEFAULT_OPTION_PROPS : SELECTED_OPTION_PROPS,
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
                ...convertCollectionToOption(
                    collectionsWithSameName[0],
                    dispatch,
                    selectedCollection
                ),
                split: collectionsWithSameName.length > 1,
                // Add datasets of the same name, but different version, as sub options
                subMenuProps:
                    collectionsWithSameName.length > 1
                        ? {
                              items: collectionsWithSameName.map((collection, index) => ({
                                  ...convertCollectionToOption(
                                      collection,
                                      dispatch,
                                      selectedCollection
                                  ),
                                  text:
                                      index === 0
                                          ? `Version ${collection.version} (Default)`
                                          : `Version ${collection.version}`,
                              })),
                          }
                        : undefined,
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
                if (selectedCollection) {
                    props.onCollapse();
                    dispatch(interaction.actions.generatePythonSnippet(selectedCollection));
                }
            },
            itemProps: DEFAULT_OPTION_PROPS,
        },
    ];

    return (
        <div className={props.className}>
            <div className={styles.controlGroupInputGroup}>
                <SearchableDropdown
                    className={styles.controlGroupDropdown}
                    isHidden={props.isCollapsed}
                    options={collectionOptions}
                    selectedOption={selectedCollection?.name || ALL_FILES_KEY}
                    onSearch={setSearchValue}
                    searchValue={searchValue}
                />
                <div className={styles.controlGroupDisplayGroup}>
                    <TooltipHost content={IS_PRIVATE_TOOLTIP} onMouseLeave={props.onCollapse}>
                        <h6 className={styles.controlGroupDisplay}>
                            {selectedCollection?.private ? "Private" : "Public"}
                        </h6>
                    </TooltipHost>
                    <TooltipHost content={IS_FIXED_TOOLTIP} onMouseLeave={props.onCollapse}>
                        <h6 className={styles.controlGroupDisplay}>
                            {selectedCollection?.fixed ? "Fixed" : "Not Fixed"}
                        </h6>
                    </TooltipHost>
                </div>
            </div>
            <div className={styles.controlGroupButtons}>
                <IconButton
                    className={styles.controlGroupButton}
                    data-testid="edit-button"
                    disabled={!selectedCollection}
                    iconProps={{ iconName: "edit" }}
                    styles={SECONDARY_BUTTON_STYLES}
                    onClick={() => dispatch(interaction.actions.showEditCollectionDialog())}
                />
                <IconButton
                    className={styles.controlGroupButton}
                    data-testid="export-button"
                    iconProps={{ iconName: "export" }}
                    title="Export"
                    menuProps={{ items: collectionExportMenuOptions }}
                    disabled={!selectedCollection}
                    styles={SECONDARY_BUTTON_STYLES}
                />
            </div>
        </div>
    );
}
