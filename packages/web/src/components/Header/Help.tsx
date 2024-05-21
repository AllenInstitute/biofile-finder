import { DirectionalHint, IContextualMenuItem, PrimaryButton } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import styles from "./Help.module.css";

interface Props {
    path: string;
}

export default function HelpMenu(props: Props) {
    const isAppRoute: boolean = props.path == "/app";

    const helpMenuOptions: IContextualMenuItem[] = [
        {
            key: "tutorials",
            text: "In-app tutorials",
            style: !isAppRoute ? { display: "none" } : {},
        },
        {
            key: "reportissue",
            text: `Report issue in GitHub`,
            href: "https://github.com/AllenInstitute/aics-fms-file-explorer-app/issues",
            target: "_blank",
            style: !isAppRoute ? { display: "none" } : {},
        },
        {
            key: "github",
            text: `Visit GitHub page`,
            href: "https://github.com/AllenInstitute/aics-fms-file-explorer-app",
            target: "_blank",
        },
        {
            key: "forum",
            text: "Allen Cell Discussion Forum",
        },
        {
            key: "version",
            text: "Version info",
            style: !isAppRoute ? { display: "none" } : {},
        },
    ];

    return (
        <PrimaryButton
            ariaLabel="Help"
            className={classNames(styles.helpMenuButton, styles.headerOption)}
            styles={{ label: styles.helpMenuLabel }}
            id="helpmenu"
            menuIconProps={{ iconName: "ChevronDown" }}
            text="Help"
            menuProps={{
                className: styles.helpMenu,
                directionalHint: DirectionalHint.bottomAutoEdge,
                shouldFocusOnMount: true,
                items: helpMenuOptions,
            }}
        />
    );
}
