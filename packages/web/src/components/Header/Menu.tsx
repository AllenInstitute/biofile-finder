import { DirectionalHint, PrimaryButton as PrimaryFluent } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch } from "react-redux";
import { Link, useLocation } from "react-router-dom";

import { TertiaryButton, useButtonMenu } from "../../../../core/components/Buttons";
import useHelpOptions from "../../../../core/hooks/useHelpOptions";
import LaunchAppMenu from "../LaunchAppMenu";
import { EXAMPLE_DATASET_URL } from "../../constants";

import styles from "./Menu.module.css";

/**
 * Menu options for the Header at the top of the BFF web page
 */
export default function Menu() {
    const dispatch = useDispatch();
    const currentPath = useLocation().pathname;
    const isApp: boolean = currentPath == "/app";
    const helpMenuOptions = useHelpOptions(dispatch, true, isApp);
    const helpMenu = useButtonMenu({
        items: helpMenuOptions,
        directionalHint: DirectionalHint.bottomAutoEdge,
    });

    return (
        <>
            <div className={classNames(styles.right, styles.largeMenu)}>
                <Link
                    to="datasets"
                    className={styles.routeLink}
                    target={isApp ? "_blank" : "_self"}
                    rel="noreferrer"
                >
                    Open-source datasets
                </Link>
                <Link
                    to="learn"
                    className={styles.routeLink}
                    target={isApp ? "_blank" : "_self"}
                    rel="noreferrer"
                >
                    Learn
                </Link>
                <PrimaryFluent
                    ariaLabel="Help"
                    className={styles.helpMenuButton}
                    styles={{ label: styles.helpMenuLabel }}
                    menuIconProps={{ iconName: "ChevronDown" }}
                    menuProps={helpMenu}
                    text="Help"
                />
                {currentPath !== "/app" && <LaunchAppMenu className={styles.startButton} />}
            </div>
            <div className={styles.smallMenu}>
                <TertiaryButton
                    iconName="NumberedListText"
                    title="Menu"
                    menuItems={[
                        {
                            key: "start",
                            text: "Start with your data",
                            target: "_self",
                            rel: "noreferrer",
                            href: "/app",
                        },
                        {
                            key: "example-dataset",
                            text: "Explore example dataset",
                            target: "_self",
                            rel: "noreferrer",
                            href: EXAMPLE_DATASET_URL,
                        },
                        {
                            key: "datasets",
                            text: "Datasets",
                            target: isApp ? "_blank" : "_self",
                            rel: "noreferrer",
                            href: "/datasets",
                        },
                        {
                            key: "learn",
                            text: "Learn",
                            target: isApp ? "_blank" : "_self",
                            rel: "noreferrer",
                            href: "/learn",
                        },
                        {
                            key: "help",
                            text: "Help",
                            subMenuProps: helpMenu,
                        },
                    ]}
                />
            </div>
        </>
    );
}
