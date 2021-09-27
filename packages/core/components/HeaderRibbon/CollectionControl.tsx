import {
    IButtonStyles,
    ContextualMenuItemType,
    IContextualMenuItem,
    IconButton,
    Icon,
    IContextualMenuItemProps,
} from "@fluentui/react";
import { orderBy } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { Dataset } from "../../services/DatasetService";
import { interaction, metadata, selection } from "../../state";
import SearchableDropdown from "../SearchableDropdown";

const styles = require("./HeaderRibbon.module.css");

interface Props {
    className?: string;
}

const ALL_FILES_KEY = "All of FMS";

const SECONDARY_BUTTON_STYLES: IButtonStyles = {
    label: {
        fontWeight: "normal",
    },
};

const DEFAULT_OPTION_PROPS: Partial<IContextualMenuItemProps> = {
    styles: {
        divider: {
            // Color is lightened tint of --primary-brand-dark-blue defined in App.module.css
            backgroundColor: "#1A4A71",
        },
        item: {
            // Color is lightened tint of --primary-brand-dark-blue defined in App.module.css
            backgroundColor: "#1A4A71",
            color: "white",
        },
        label: {
            color: "white",
        },
        root: {
            ":hover": {
                // Equivalent to --primary-brand-dark-blue defined in App.module.css
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
                                  itemProps:
                                      collection.id !== selectedCollection?.id
                                          ? DEFAULT_OPTION_PROPS
                                          : SELECTED_OPTION_PROPS,
                              })),
                          }
                        : undefined,
                onClick: () => {
                    dispatch(selection.actions.changeCollection(collectionsWithSameName[0].id));
                },
                itemProps:
                    collectionsWithSameName[0].id !== selectedCollection?.id
                        ? DEFAULT_OPTION_PROPS
                        : SELECTED_OPTION_PROPS,
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
            itemProps: DEFAULT_OPTION_PROPS,
        },
    ];

    return (
        <div className={props.className}>
            <div className={styles.controlGroupInputGroup}>
                <SearchableDropdown
                    className={styles.controlGroupDropdown}
                    options={collectionOptions}
                    selectedOption={selectedCollection?.name || ALL_FILES_KEY}
                    onSearch={setSearchValue}
                    searchValue={searchValue}
                />
                <div className={styles.controlGroupCheckboxGroup}>
                    <div className={styles.controlGroupCheckbox}>
                        <Icon
                            iconName={
                                selectedCollection?.private ? "CheckboxComposite" : "Checkbox"
                            }
                        />
                        <h6 className={styles.controlGroupCheckboxLabel}>Is Private?</h6>
                    </div>
                    <div className={styles.controlGroupCheckbox}>
                        <Icon
                            iconName={selectedCollection?.fixed ? "CheckboxComposite" : "Checkbox"}
                        />
                        <h6 className={styles.controlGroupCheckboxLabel}>Is Fixed?</h6>
                    </div>
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
    );
}
