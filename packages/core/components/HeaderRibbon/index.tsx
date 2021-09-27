import classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";

import { selection } from "../../state";
import CollectionControl from "./CollectionControl";

const styles = require("./HeaderRibbon.module.css");

interface HeaderRibbonProps {
    className?: string;
}

/**
 * Ribbon-like toolbar at the top of the application to contain features like application-level view options.
 */
export default function HeaderRibbon(props: HeaderRibbonProps) {
    const selectedCollection = useSelector(selection.selectors.getSelectedCollection);
    const [isCollapsed, setCollapsed] = React.useState(true);

    return (
        <div
            className={classNames(
                styles.root,
                { [styles.collapsed]: isCollapsed },
                props.className
            )}
        >
            <div className={styles.headerBar} onClick={() => setCollapsed(!isCollapsed)}>
                <h5 className={styles.controlGroup}>
                    Collection{" "}
                    {isCollapsed && selectedCollection && `(${selectedCollection?.name})`}
                </h5>
            </div>
            <CollectionControl
                className={styles.controlGroup}
                selectedCollection={selectedCollection}
            />
        </div>
    );
}
