import {
    ContextualMenu,
    Icon,
    IconButton,
    IContextualMenuItem,
    IContextualMenuItemProps,
    IContextualMenuItemRenderFunctions,
    IStyle,
} from "@fluentui/react";
import * as React from "react";
import { useDispatch } from "react-redux";

import Tutorial from "../../entity/Tutorial";
import { interaction, selection } from "../../state";

import styles from "./HeaderRibbon.module.css";

interface Props {
    className?: string;
    id: string;
    isCollapsed?: boolean;
    onCollapse: () => void;
}

// Color is lightened tint of --primary-brand-dark-blue defined in App.module.css
const LIGHTENED_PRIMARY_DARK_BLUE = "#1A4A71";
// Equivalent to --primary-brand-dark-blue defined in App.module.css
const PRIMARY_DARK_BLUE = "#003057";

const MENU_STYLES: IStyle = {
    backgroundColor: LIGHTENED_PRIMARY_DARK_BLUE,
    color: "white",
    ":hover": {
        backgroundColor: PRIMARY_DARK_BLUE,
        color: "white",
    },
    ":active": {
        backgroundColor: PRIMARY_DARK_BLUE,
        color: "white",
    },
};

const OPTION_PROPS: Partial<IContextualMenuItemProps> = {
    styles: {
        label: {
            color: "white",
            textAlign: "right",
        },
        item: MENU_STYLES,
        root: MENU_STYLES,
    },
};

const ICON_BUTTON_STYLES = {
    icon: {
        color: "#FFFFFF",
    },
};

const ORGANIZE_FILES_TUTORIAL = new Tutorial("Organizing")
    .addStep({
        targetId: Tutorial.ANNOTATION_LIST_ID,
        message:
            'All annotations that have files tagged with them are present in this list. Drag and drop an annotation in this list into the "Annotation Hierarchy" above (try "Cell Line" for example).',
    })
    .addStep({
        targetId: Tutorial.FILE_LIST_ID,
        message:
            "Each folder represents a value for the annotation and the files within the folder are guaranteed to have been annotated with that annotation name + value",
    })
    .addStep({
        targetId: Tutorial.ANNOTATION_HIERARCHY_ID,
        message:
            "This will display the hierarchy of the dynamically generated folders to the right which are determined by the order in which you add annotations to this hierarchy (they can be rearranged by dragging them around)",
    });

const OPEN_FILES_TUTORIAL = new Tutorial("Opening files")
    .addStep({
        targetId: Tutorial.FILE_LIST_ID,
        message:
            "Select the file you want to open (or at least one you could open like maybe a CZI)",
    })
    .addStep({
        targetId: Tutorial.FILE_LIST_ID,
        message:
            'Right-click the now highlighted file and select "Open with" to select a specific application with which to open the file in. You can also have the explorer guess at which application to open by selecting the "Open" option instead, this will open the file in the default application your computer has saved for this file type or just the last application used to open the same type',
    });

const GENERATE_MANIFEST_TUTORIAL = new Tutorial("Generating manifests")
    .addStep({
        targetId: Tutorial.FILE_LIST_ID,
        message:
            "Select a file by left-clicking or multiple by holding Shift or Ctrl and clicking multiple files (any will do for this tutorial)",
    })
    .addStep({
        targetId: Tutorial.FILE_LIST_ID,
        message:
            'Right-click any of the highlighted files and select "Generate CSV manifest". This will open a modal in which you will be guided through creating a CSV that is a list of the files selected where the columns are the annotations present for those files.',
    });

const CREATE_COLLECTION_TUTORIAL = new Tutorial("Creating collections")
    .addStep({
        targetId: Tutorial.FILE_LIST_ID,
        message:
            "Select a file by left-clicking or multiple by holding Shift or Ctrl and clicking multiple files (any will do for this tutorial)",
    })
    .addStep({
        targetId: Tutorial.FILE_LIST_ID,
        message:
            'Right-click any of the highlighted files and select "Share Collection" then choose a Configuration. Use the default for this tutorial which will make the collection available for one day and allow the metadata to be updated (if any updates occur), but in the future select "Configure..." and explore the options available.',
    })
    .addStep({
        targetId: Tutorial.COLLECTIONS_TITLE_ID,
        message: (
            <span>
                Once the app reports that your collection has been created (as a status near the top
                of the app) it will be available here in this dropdown. Select the option that has
                your username + a timestamp of when you created it. If you used the default
                configuration it will be present here for one day and only available to you{" "}
                <strong>unless</strong> you share it using the URL feature (see the &quot;Sharing
                current view&quot; tutorial for that)
            </span>
        ),
    })
    .addStep({
        targetId: Tutorial.FILE_LIST_ID,
        message:
            'The files available to search against are now limited to just those selected to be a part of your collection. To return back to the default of "All of FMS" (i.e. all files) navigate to the Collection header again and select that option from the dropdown',
    });

const SHARE_VIEW_TUTORIAL = new Tutorial("Sharing current view (URL)")
    .addStep({
        targetId: Tutorial.COPY_URL_BUTTON_ID,
        message:
            "Copy your current view (i.e. your combination of filters, sorts, and open files) by clicking here. This will automatically copy the URL to your clipboard (like when you press Ctrl+C)",
    })
    .addStep({
        targetId: Tutorial.URL_BOX_ID,
        message: "Paste a copied view (URL) here and press Enter to have it load",
    });

const FILTER_FILES_TUTORIAL = new Tutorial("Filtering")
    .addStep({
        targetId: Tutorial.ANNOTATION_LIST_ID,
        message: (
            <span>
                Filters for <strong>annotations</strong> can be found and used by clicking the{" "}
                <Icon iconName="FilterSolid" /> icon for the annotation to filter by and selecting
                which annotation values the files must have
            </span>
        ),
    })
    .addStep({
        targetId: Tutorial.FILE_ATTRIBUTE_FILTER_ID,
        message:
            "Files can also be filtered by these attributes by selecting one from the dropdown menu (ex. 'Uploaded') " +
            'and entering a value. The value for attributes like "File "name" do not have to be exact and can instead be ' +
            'partial matches (ex. entering "AD0000057" would show file "AD00000573_100x_20220729_H01_001_Scene-44_aligned.ome.tiff")',
    })
    .addStep({
        targetId: Tutorial.VIEWS_TITLE_ID,
        message:
            'Views can be useful to quickly apply a set of filters and sorts. Currently there are only "Views" surrounding the "Uploaded" attribute, but there could be more in the future.',
    });

const SORT_FILES_TUTORIAL = new Tutorial("Sorting").addStep({
    targetId: Tutorial.COLUMN_HEADERS_ID,
    message:
        'Files can be sorted by clicking the title of a column, by default files are sorted by the "Uploaded" date. Can\'t find the column you want to sort by? To modify the columns shown so that you can sort by another column see the "Modifying columns in file list" tutorial.',
});

const MODIFY_COLUMNS_TUTORIAL = new Tutorial("Modifying file list columns").addStep({
    targetId: Tutorial.COLUMN_HEADERS_ID,
    message:
        'The columns in the file list can be added or removed at will by right-clicking anywhere near the titles of the columns and selecting "Modify columns" and selecting which columns to show. The width of a column can be changed by dragging the bars | following the column titles.',
});

/**
 * Menu group providing quick links to useful related pages and also a tutorial system
 */
export default function HelpControl(props: Props) {
    const { isCollapsed } = props;
    const dispatch = useDispatch();
    const iconButtonReference = React.useRef(null);
    const [showDropdown, setShowDropdown] = React.useState(false);

    // Hide dropdown whenever whole component is collapsed
    React.useEffect(() => {
        if (isCollapsed) {
            setShowDropdown(false);
        }
    }, [isCollapsed, setShowDropdown]);

    type NewType = IContextualMenuItemProps;

    const helpOptions: IContextualMenuItem[] = [
        {
            key: "submit-request",
            text: "Submit Request",
            title:
                "Opens up a webpage where you can submit a JIRA ticket describing your request/feedback, we will contact you shortly after the ticket is made",
            href:
                "https://aicsjira.corp.alleninstitute.org/secure/project/CreateIssue.jspa?issuetype=1&pid=10406",
            target: "_blank",
            itemProps: OPTION_PROPS,
        },
        {
            key: "download-newest-version",
            text: "Download Newest Version",
            title: "Opens the FMS File Explorer download page",
            href: "https://alleninstitute.github.io/aics-fms-file-explorer-app/",
            target: "_blank",
            itemProps: OPTION_PROPS,
        },
        {
            key: "tips-and-tricks",
            text: "Tips & Tricks",
            title:
                "Opens a short description of some tips & tricks to hopefully improve your app experience",
            onClick: () => {
                props.onCollapse();
                dispatch(interaction.actions.showTipsAndTricksDialog());
            },
            itemProps: OPTION_PROPS,
        },
        {
            key: "tutorials",
            text: "Tutorials",
            title:
                "List of available tutorials useful for getting familiar with the features of this application",
            itemProps: OPTION_PROPS,
            onRenderContent: (
                props: NewType,
                defaultRenders: IContextualMenuItemRenderFunctions
            ) => (
                <>
                    <Icon iconName="CaretSolidLeft" />
                    {defaultRenders.renderItemName(props)}
                </>
            ),
            subMenuProps: {
                items: [
                    {
                        key: "Organizing",
                        text: 'Organizing ("Annotation Hierarchy")',
                        title:
                            "How to organize the files in the file list into hierarchical folders using the annotation hierarchy",
                        onClick: () => {
                            props.onCollapse();
                            dispatch(selection.actions.selectTutorial(ORGANIZE_FILES_TUTORIAL));
                        },
                        itemProps: OPTION_PROPS,
                    },
                    {
                        key: "Filtering",
                        text: "Filtering",
                        title: "How to filter files in the file list",
                        onClick: () => {
                            props.onCollapse();
                            dispatch(selection.actions.selectTutorial(FILTER_FILES_TUTORIAL));
                        },
                        itemProps: OPTION_PROPS,
                    },
                    {
                        key: "Sorting",
                        text: "Sorting",
                        title: "How to sort the files shown in the file list",
                        onClick: () => {
                            props.onCollapse();
                            dispatch(selection.actions.selectTutorial(SORT_FILES_TUTORIAL));
                        },
                        itemProps: OPTION_PROPS,
                    },
                    {
                        key: "Modifying columns in file list",
                        text: "Modifying columns in file list",
                        title: "How to modify the columns present in the file list",
                        onClick: () => {
                            props.onCollapse();
                            dispatch(selection.actions.selectTutorial(MODIFY_COLUMNS_TUTORIAL));
                        },
                        itemProps: OPTION_PROPS,
                    },
                    {
                        key: "Opening files in another application",
                        text: "Opening files in another application",
                        title:
                            "How to open a file in another application without downloading or copying and pasting the file path",
                        onClick: () => {
                            props.onCollapse();
                            dispatch(selection.actions.selectTutorial(OPEN_FILES_TUTORIAL));
                        },
                        itemProps: OPTION_PROPS,
                    },
                    {
                        key: 'Creating "Collections"',
                        text: 'Creating "Collections"',
                        title:
                            'How to create a "Collection" of files for preservation, ML, or sharing purposes',
                        onClick: () => {
                            props.onCollapse();
                            dispatch(selection.actions.selectTutorial(CREATE_COLLECTION_TUTORIAL));
                        },
                        itemProps: OPTION_PROPS,
                    },
                    {
                        key: "Generating CSV manifests",
                        text: "Generating CSV Manifests",
                        title: "How to create a CSV manifest of files' metadata",
                        onClick: () => {
                            props.onCollapse();
                            dispatch(selection.actions.selectTutorial(GENERATE_MANIFEST_TUTORIAL));
                        },
                        itemProps: OPTION_PROPS,
                    },
                    {
                        key: "Sharing current view (URL)",
                        text: "Sharing current view (URL)",
                        title:
                            "How to share your current view (i.e. your filters/sorts/open folders etc.)",
                        onClick: () => {
                            props.onCollapse();
                            dispatch(selection.actions.selectTutorial(SHARE_VIEW_TUTORIAL));
                        },
                        itemProps: OPTION_PROPS,
                    },
                ],
            },
        },
    ];

    return (
        <div className={props.className} id={props.id} onMouseLeave={() => setShowDropdown(false)}>
            <div className={styles.helpButtonContainer} ref={iconButtonReference}>
                <div className={styles.helpButtonCircle} />
                <IconButton
                    ariaDescription="Help menu"
                    iconProps={{ iconName: "Help" }}
                    className={styles.helpButton}
                    onMouseEnter={() => !isCollapsed && setShowDropdown(true)}
                    styles={ICON_BUTTON_STYLES}
                />
            </div>
            <ContextualMenu
                items={helpOptions}
                hidden={!showDropdown}
                target={iconButtonReference.current}
                onDismiss={() => setShowDropdown(false)}
                onItemClick={() => setShowDropdown(false)}
                // Auto adjusts width minimum to input width
                useTargetAsMinWidth
                // Required to have width auto-adjust
                shouldUpdateWhenHidden
            />
        </div>
    );
}
