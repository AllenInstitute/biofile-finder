import classNames from "classnames";
import { DirectionalHint, IContextualMenuItem, PrimaryButton } from "@fluentui/react";
import * as React from "react";
import { useNavigate } from "react-router-dom";

import styles from "./Help.module.css";

interface Props {
    path: string;
}

// Banner for the splash page
export default function HelpMenu(props: Props) {
    const isApp: boolean = props.path == "/app";
    const navigate = useNavigate();

    function redirect(
        ev?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
        item?: IContextualMenuItem
    ): void {
        if (item?.data) {
            if (isApp) {
                window.open(item.data, "_blank", "noreferrer"); // open in new tab while in app
            } else navigate(item.data);
        }
    }

    const helpMenuOptions: IContextualMenuItem[] = [
        {
            key: "learn",
            text: "Learn",
            data: "/learn", // path for router
            onClick: redirect,
        },
        {
            key: "tutorials",
            text: "In-app tutorials",
            style: !isApp ? { display: "none" } : {},
        },
        {
            key: "reportissue",
            text: `Report issue in GitHub`,
            href: "https://github.com/AllenInstitute/aics-fms-file-explorer-app/issues",
            target: "_blank",
            style: !isApp ? { display: "none" } : {},
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
            style: !isApp ? { display: "none" } : {},
        },
    ];

    return (
        <PrimaryButton
            ariaLabel="Help"
            className={classNames(styles.helpMenuButton, styles.headerOption)}
            styles={{ label: { "font-weight": "400", "font-size": "16px" } }}
            id="helpmenu"
            menuIconProps={{ iconName: "ChevronDown" }}
            text="Help"
            menuProps={{
                className: styles.helpMenu,
                directionalHint: DirectionalHint.bottomAutoEdge,
                shouldFocusOnMount: true,
                items: helpMenuOptions,
                styles: {
                    container: {
                        filter: "drop-shadow(black 100px 14px 18px)",
                        "background-color": "green !important",
                    },
                },
            }}
        />
    );
}
