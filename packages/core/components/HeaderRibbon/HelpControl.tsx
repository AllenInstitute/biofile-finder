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

import { interaction, selection } from "../../state";
import {
    CREATE_COLLECTION_TUTORIAL,
    FILTER_FILES_TUTORIAL,
    GENERATE_MANIFEST_TUTORIAL,
    MODIFY_COLUMNS_TUTORIAL,
    OPEN_FILES_TUTORIAL,
    ORGANIZE_FILES_TUTORIAL,
    SHARE_VIEW_TUTORIAL,
    SORT_FILES_TUTORIAL,
} from "./tutorials";

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
                <IconButton
                    ariaDescription="Help menu"
                    iconProps={{ iconName: "Help" }}
                    className={styles.helpButton}
                    onMouseEnter={() => !isCollapsed && setShowDropdown(true)}
                    styles={ICON_BUTTON_STYLES}
                />
                <div className={styles.helpButtonCircle} />
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
