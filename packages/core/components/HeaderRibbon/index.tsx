import { Icon, TeachingBubble, TooltipHost } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import Tutorial from "../../entity/Tutorial";
import { interaction, selection } from "../../state";
import CollectionControl from "./CollectionControl";
import HelpControl from "./HelpControl";
import ViewControl from "./ViewControl";

import styles from "./HeaderRibbon.module.css";

interface HeaderRibbonProps {
    className?: string;
}

const COLLECTION_TOOLTIP =
    'A "collection" is a previously saved set of files. Selecting one of these will narrow down the possible set of findable files down to those saved within this collection. You can create collections by selecting files, right-clicking, and selecting "Share Collection."';
const VIEW_TOOLTIP =
    'A "view" is a pre-selected set of filters and/or sorts that when selected using this dropdown will add to (or potentially replace) your current filters and/or sorts with the pre-selected filters/sorts. You can then add or remove any filters/sorts at will.';
const HELP_TOOLTIP =
    "This menu provides quick links to related pages, as well as a tutorial system.";

const HELP_CONTROL_ID = "help-control";
const HELP_TITLE_ID = "help-title";

/**
 * Ribbon-like toolbar at the top of the application to contain features like application-level view options.
 */
export default function HeaderRibbon(props: HeaderRibbonProps) {
    const dispatch = useDispatch();
    const selectedCollection = useSelector(selection.selectors.getCollection);
    const hasUsedApplicationBefore = useSelector(interaction.selectors.hasUsedApplicationBefore);

    const [isCollapsed, setCollapsed] = React.useState(true);

    function onMouseLeaveHeaderRibbon() {
        setCollapsed(true);
        dispatch(interaction.actions.markAsUsedApplicationBefore());
    }

    return (
        <div
            className={classNames(styles.root, props.className)}
            onMouseEnter={() => setCollapsed(false)}
            onMouseLeave={onMouseLeaveHeaderRibbon}
        >
            <div className={styles.headerBar}>
                <h5 className={styles.controlGroup}>
                    <div id={Tutorial.COLLECTIONS_TITLE_ID}>
                        Collection {selectedCollection && `(${selectedCollection?.name})`}
                    </div>
                    <TooltipHost content={COLLECTION_TOOLTIP}>
                        <Icon className={styles.infoIcon} iconName="Info" />
                    </TooltipHost>
                </h5>
                <h5 className={styles.controlGroup}>
                    <div id={Tutorial.VIEWS_TITLE_ID}>View</div>
                    <TooltipHost content={VIEW_TOOLTIP}>
                        <Icon className={styles.infoIcon} iconName="Info" />
                    </TooltipHost>
                </h5>
                <div className={classNames(styles.controlGroup, styles.filler)} />
                <h5 className={classNames(styles.controlGroup, styles.smallerControlGroup)}>
                    <div id={HELP_TITLE_ID}>Help</div>
                    <TooltipHost content={HELP_TOOLTIP}>
                        <Icon className={styles.infoIcon} iconName="Info" />
                    </TooltipHost>
                </h5>
            </div>
            <div className={classNames(styles.controlGroups, { [styles.collapsed]: isCollapsed })}>
                <CollectionControl
                    className={styles.controlGroup}
                    isCollapsed={isCollapsed}
                    selectedCollection={selectedCollection}
                    onCollapse={() => setCollapsed(true)}
                />
                <ViewControl className={styles.controlGroup} isCollapsed={isCollapsed} />
                <div className={classNames(styles.controlGroup, styles.filler)} />
                <HelpControl
                    className={classNames(styles.controlGroup, styles.smallerControlGroup)}
                    id={HELP_CONTROL_ID}
                    isCollapsed={isCollapsed}
                    onCollapse={() => setCollapsed(true)}
                />
            </div>
            {!hasUsedApplicationBefore && (
                <TeachingBubble
                    hasCloseButton
                    hasSmallHeadline
                    onDismiss={() => dispatch(interaction.actions.markAsUsedApplicationBefore())}
                    headline="Check this out first!"
                    target={`#${isCollapsed ? HELP_TITLE_ID : HELP_CONTROL_ID}`}
                    styles={{
                        closeButton: {
                            ":hover": {
                                backgroundColor: "#FFFFFF",
                                // Equivalent to --primary-brand-purple defined in App.module.css
                                color: "#827aa3",
                            },
                        },
                        root: {
                            className: styles.tutorialContainer,
                            " div": {
                                // Equivalent to --primary-brand-purple defined in App.module.css
                                backgroundColor: "#827aa3",
                                color: "white",
                            },
                        },
                    }}
                >
                    New or returning user? Please refer to this Help section for useful links and
                    tutorials. The tutorial list might help uncover features you might not know
                    about!
                </TeachingBubble>
            )}
        </div>
    );
}
