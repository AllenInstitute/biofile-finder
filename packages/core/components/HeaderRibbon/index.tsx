import classNames from "classnames";
import { DefaultButton, Dropdown, Icon, IconButton, IContextualMenuItem, IDropdownOption } from "office-ui-fabric-react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction, metadata, selection } from "../../state";

const styles = require("./HeaderRibbon.module.css");

interface HeaderRibbonProps {
    className?: string;
}

/**
 * Ribbon-like toolbar at the top of the application to contain features like application-level view options.
 */
export default function HeaderRibbon(props: HeaderRibbonProps) {
    const dispatch = useDispatch();
    const selectedViewId = useSelector(selection.selectors.getViewId);
    const selectedCollectionId = useSelector(selection.selectors.getFileSetSourceId);
    const views = useSelector(metadata.selectors.getViews);
    const collections = useSelector(metadata.selectors.getDatasets);

    const [isCollapsed, setCollapsed] = React.useState(false);

    // TODO: Selectorize
    const selectedView = views.find(view => view.id === selectedViewId);
    const selectedCollection = collections.find(collection => collection.id === selectedCollectionId);

    const viewOptions: IDropdownOption[] = views.map(view => ({ key: view.name, text: view.name, onClick: () => {
        dispatch(selection.actions.changeView(view.id));
    }}));
    const collectionOptions: IDropdownOption[] = collections.map(collection => ({ key: collection.name, text: collection.name, onClick: () => {
        dispatch(selection.actions.setFileSetSource(collection.id));
    }}));

    const viewMenu: IContextualMenuItem[] = [
        {
            key: "select",
            text: "Select",
            title: "Select a view (collection of filters, groupings, and sorting)",
            subMenuProps: {
                items: viewOptions
            },
        },
        {
            key: "edit",
            disabled: !selectedViewId,
            text: "Edit",
            title: "Edit the current view metadata",
            onClick: () => {
                console.log("Editing this view");
            }
        },
        {
            key: "save",
            text: "Save",
            disabled: !selectedViewId,
            title: "Update the selected view",
            onClick: () => {
                console.log("Saving this view")
            }
        },
        {
            key: "save-as",
            text: "Save as...",
            disabled: !selectedViewId,
            title: "Save the current view as new",
            onClick: () => {
                console.log("Saving this view as new")
            }
        }
    ];

    const collectionMenu: IContextualMenuItem[] = [
        {
            key: "select",
            text: "Select",
            title: "Select a collection (set of files)",
            subMenuProps: {
                items: collectionOptions
            },
        },
        {
            key: "edit",
            disabled: !selectedCollectionId,
            text: "Edit",
            title: "Edit the current collection metadata",
            onClick: () => {
                console.log("Editing this collection");
                // TODO: Show edit...
                dispatch(interaction.actions.showGenerateFileSetDialog())
            }
        },
        {
            key: "save-as",
            text: "Save as...",
            title: "Save the current collection as new",
            onClick: () => {
                dispatch(interaction.actions.showGenerateFileSetDialog())
            }
        }
    ];

    if (isCollapsed) {
        return (
            <div className={classNames(styles.root, props.className, styles.collapsed)}>
                <div>
                    {selectedView && `View: ${selectedView.name}`}
                    {selectedCollectionId && `Collection: ${selectedCollection?.name}`}
                </div>
            <div className={styles.collapseButton} onClick={() => setCollapsed(false)}><IconButton className={styles.collapseIcon} iconProps={{ iconName: "DoubleChevronUp12" }} onClick={() => setCollapsed(false)} /></div>
            </div>
        );
    }

     return (
        <div className={classNames(styles.root, props.className)}>
            <div>
                <div className={styles.buttonGroup}>
                    <Dropdown
                        placeholder="No view selected"
                        onChange={(_, o) => dispatch(selection.actions.changeView(o?.key as string))}
                        options={viewOptions}
                    />
                    <div className={styles.buttonRow}>
                        <DefaultButton
                            iconProps={{iconName: "save"}}
                            text="Save As..."
                        />
                        <DefaultButton
                            iconProps={{iconName: "edit"}}
                            text="Edit"
                        />
                    </div>
                    <h5>View</h5>
                </div>
                <div className={styles.buttonGroup}>
                    <Dropdown
                        placeholder="No collection selected"
                        onChange={(_, o) => dispatch(selection.actions.setFileSetSource(o?.key as string))}
                        options={collectionOptions}
                    />
                    <div className={styles.buttonRow}>
                        <DefaultButton
                            iconProps={{iconName: "save"}}
                            text="Save As..."
                        />
                        <DefaultButton
                            iconProps={{iconName: "edit"}}
                            text="Edit"
                        />
                    </div>
                    <h5>Collection</h5>
                </div>
            </div>
            <div className={styles.collapseButton}><IconButton className={styles.collapseIcon} iconProps={{ iconName: "DoubleChevronDown12" }} onClick={() => setCollapsed(true)} /></div>
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
