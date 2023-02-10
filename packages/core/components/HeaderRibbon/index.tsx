import classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";

import { selection } from "../../state";
import CollectionControl from "./CollectionControl";
import ViewControl from "./ViewControl";

import styles from "./HeaderRibbon.module.css";
import { Icon, TooltipHost } from "@fluentui/react";

interface HeaderRibbonProps {
    className?: string;
}

const COLLECTION_TOOLTIP =
    'A "collection" is a previously saved set of files. Selecting one of these will narrow down the possible set of findable files down to those saved within this collection. You can create collections by selecting files, right-clicking, and selecting "Share Collection."';
const VIEW_TOOLTIP =
    'A "view" is a pre-selected set of filters and/or sorts that when selected using this dropdown will add to (or potentially replace) your current filters and/or sorts with the pre-selected filters/sorts. You can then add or remove any filters/sorts at will.';

/**
 * Ribbon-like toolbar at the top of the application to contain features like application-level view options.
 */
export default function HeaderRibbon(props: HeaderRibbonProps) {
    const selectedCollection = useSelector(selection.selectors.getCollection);

    const [isCollapsed, setCollapsed] = React.useState(true);

    return (
        <div
            className={classNames(styles.root, props.className)}
            onMouseEnter={() => setCollapsed(false)}
            onMouseLeave={() => setCollapsed(true)}
        >
            <div className={styles.headerBar}>
                <h5 className={styles.controlGroup}>
                    <div>Collection {selectedCollection && `(${selectedCollection?.name})`}</div>
                    <TooltipHost content={COLLECTION_TOOLTIP}>
                        <Icon className={styles.infoIcon} iconName="Info" />
                    </TooltipHost>
                </h5>
                <h5 className={styles.controlGroup}>
                    <div>View</div>
                    <TooltipHost content={VIEW_TOOLTIP}>
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
                <ViewControl
                    className={styles.controlGroup}
                    isCollapsed={isCollapsed}
                    onCollapse={() => setCollapsed(true)}
                />
            </div>
        </div>
    );
}
