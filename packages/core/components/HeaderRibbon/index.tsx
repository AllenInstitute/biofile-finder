import classNames from "classnames";
import * as React from "react";

import CollectionControl from "./CollectionControl";

const styles = require("./HeaderRibbon.module.css");

interface HeaderRibbonProps {
    className?: string;
}

/**
 * Ribbon-like toolbar at the top of the application to contain features like application-level view options.
 */
export default function HeaderRibbon(props: HeaderRibbonProps) {
    const [isCollapsed, setCollapsed] = React.useState(true);

    return (
        <div
            className={classNames(
                styles.root,
                { [styles.collapsed]: isCollapsed },
                props.className
            )}
        >
            <CollectionControl
                isCollapsed={isCollapsed}
                onToggleCollapse={() => setCollapsed(!isCollapsed)}
            />
        </div>
    );
}
