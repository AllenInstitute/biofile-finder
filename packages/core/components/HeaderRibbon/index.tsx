import classNames from "classnames";
import { DefaultButton, Dropdown, IButtonStyles, IDropdownOption } from "office-ui-fabric-react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction, metadata, selection } from "../../state";

const styles = require("./HeaderRibbon.module.css");

interface HeaderRibbonProps {
    className?: string;
}

const SECONDARY_BUTTON_STYLES: IButtonStyles = {
    label: {
        fontWeight: "normal"
    }
}

const ALL_FILES_OPTION: IDropdownOption = {
    key: "All of FMS",
    text: "All of FMS",
}

const BAD_OPTION: IDropdownOption = {
    key: "None",
    text: "None",
}

/**
 * Ribbon-like toolbar at the top of the application to contain features like application-level view options.
 */
export default function HeaderRibbon(props: HeaderRibbonProps) {
    const dispatch = useDispatch();
    const selectedViewId = useSelector(selection.selectors.getViewId);
    const selectedCollectionId = useSelector(selection.selectors.getFileSetSourceId);
    const views = useSelector(metadata.selectors.getViews);
    const collections = useSelector(metadata.selectors.getActiveDatasets);
    const filters = useSelector(selection.selectors.getFileFilters);
    const hierarchy = useSelector(selection.selectors.getAnnotationHierarchy);
    const sortColumn = useSelector(selection.selectors.getSortColumn);
    // const fileSelection = useSelector(selection.selectors.getFileSelection);

    const [isCollapsed, setCollapsed] = React.useState(false);

    // TODO: Selectorize
    const selectedView = views.find(view => view.id === selectedViewId);
    const selectedCollection = collections.find(collection => collection.id === selectedCollectionId);

    const viewOptions: IDropdownOption[] = views.map(view => ({ key: view.id, text: view.name }));
    const collectionOptions: IDropdownOption[] = [ALL_FILES_OPTION, ...collections.map(collection => ({ key: collection.id, text: collection.name }))];

    if (isCollapsed) {
        return (
            <div className={classNames(styles.root, styles.collapsed)}>
                <div className={styles.row}>
                    <div className={styles.buttonGroup}>
                        <h5 className={styles.buttonGroupLabel} onClick={() => setCollapsed(false)}>View {selectedView && `(${selectedView.name})`}</h5>
                    </div>
                    <div className={classNames(styles.groupDivider, styles.collapsedDivider)} />
                    <div className={styles.buttonGroup}>
                        <h5 className={styles.buttonGroupLabel} onClick={() => setCollapsed(false)}>Collection {selectedCollection && `(${selectedCollection.name})`}</h5>
                    </div>
                </div>
            </div>
        );
    }

     return (
        <div className={classNames(styles.root, props.className)}>
            <div className={styles.row}>
                <div className={styles.buttonGroup}>
                    <h5 className={styles.buttonGroupLabel} onClick={() => setCollapsed(true)}>View</h5>
                    <Dropdown
                        placeholder="No view selected"
                        selectedKey={selectedViewId}
                        onChange={(_, o) => o?.key === BAD_OPTION.key ? dispatch(selection.actions.changeView()) : dispatch(selection.actions.changeView(o?.key as string))}
                        options={selectedViewId ? [BAD_OPTION, ...viewOptions] : viewOptions}
                    />
                    <div className={styles.buttonRow}>
                        <DefaultButton
                            className={styles.button}
                            disabled={!selectedViewId}
                            iconProps={{iconName: "edit"}}
                            text="Edit"
                            styles={SECONDARY_BUTTON_STYLES}
                            onClick={() => dispatch(interaction.actions.showEditViewDialog())}
                        />
                        <DefaultButton
                            className={styles.button}
                            disabled={!sortColumn && !hierarchy.length && !filters.length}
                            iconProps={{iconName: "save"}}
                            text="Save"
                            menuProps={{ items: [
                                {key: "save", text: "Save", disabled: !selectedView},
                            {key:"save-as", text:"Save as...", onClick: () => { dispatch(interaction.actions.showCreateViewDialog())}}
                        ]}}
                            styles={SECONDARY_BUTTON_STYLES}
                            onClick={() => dispatch(interaction.actions.showCreateViewDialog())}
                        />
                    </div>
                </div>
                <div className={styles.groupDivider} />
                <div className={styles.buttonGroup}>
                    <h5 className={styles.buttonGroupLabel} onClick={() => setCollapsed(true)}>Collection</h5>
                    <Dropdown
                        placeholder="No collection selected"
                        selectedKey={selectedCollectionId || ALL_FILES_OPTION.key}
                        onChange={(_, o) => dispatch(selection.actions.setFileSetSource(o?.key as string))}
                        options={collectionOptions}
                    />
                    <div className={styles.buttonRow}>
                        {/* <DefaultButton
                            className={styles.button}
                            iconProps={{iconName: "save"}}
                            text="Save As..."
                            disabled={fileSelection.count() === 0}
                            styles={SECONDARY_BUTTON_STYLES}
                            onClick={() => dispatch(interaction.actions.showGenerateFileSetDialog())}
                        /> */}
                        <DefaultButton
                            className={styles.button}
                            disabled={!selectedCollectionId}
                            iconProps={{iconName: "edit"}}
                            text="Edit"
                            styles={SECONDARY_BUTTON_STYLES}
                            onClick={() => dispatch(interaction.actions.showEditFileSetDialog())}
                        />
                        <DefaultButton
                            className={styles.button}
                            iconProps={{iconName: "export"}}
                            text="Export"
                            menuProps={{ items: [{key: "python", text: "Python Snippet", onClick: () => { selectedCollection && dispatch(interaction.actions.generatePythonSnippet(selectedCollection))}}]}}
                            disabled={!selectedCollection}
                            styles={SECONDARY_BUTTON_STYLES}
                        />
                    </div>
                </div>
            </div>
        </div>
    )

    // return (
    //     <div className={classNames(styles.root, props.className)}>
    //         <div>
    //             <DefaultButton
    //                 className={styles.optionButton}
    //                 checked={!!selectedViewId}
    //                 menuProps={{ items: viewMenu }}
    //             >
    //                 <div className={styles.innerOptionButton}>
    //                     <Icon className={styles.innerOptionButtonIcon} iconName="share" />
    //                     <h5 className={styles.innerOptionButtonText}>View</h5>
    //                 </div>
    //             </DefaultButton>
    //             <DefaultButton
    //                 className={styles.optionButton}
    //                 checked={!!selectedCollectionId}
    //                 menuProps={{ items: collectionMenu }}
    //             >
    //                 <div className={styles.innerOptionButton}>
    //                     <Icon className={styles.innerOptionButtonIcon} iconName="share" />
    //                     <h5 className={styles.innerOptionButtonText}>Collection</h5>
    //                 </div>
    //             </DefaultButton>
    //         </div>
    //         <div className={styles.collapseButton}><IconButton className={styles.collapseIcon} iconProps={{ iconName: "DoubleChevronDown12" }} onClick={() => setCollapsed(true)} /></div>
    //     </div>
    // )
}
