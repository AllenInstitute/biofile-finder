import classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";

import { selection } from "../../state";
import CollectionControl from "./CollectionControl";

import styles from "./HeaderRibbon.module.css";

interface HeaderRibbonProps {
    className?: string;
}

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
                    Collection {selectedCollection && `(${selectedCollection?.name})`}
                </h5>
            </div>
            <div className={classNames(styles.controlGroups, { [styles.collapsed]: isCollapsed })}>
                <CollectionControl
                    className={styles.controlGroup}
                    isCollapsed={isCollapsed}
                    selectedCollection={selectedCollection}
                    onCollapse={() => setCollapsed(true)}
                />
            </div>
        </div>
    );
}
