import { DirectionalHint, PrimaryButton, Stack } from "@fluentui/react";
import * as React from "react";
import { useDispatch } from "react-redux";
import { Link, useLocation } from "react-router-dom";

import { APPLICATION_NAME } from "../../constants";
import { SecondaryButton, useButtonMenu } from "../../../../core/components/Buttons";
import useHelpOptions from "../../../../core/hooks/useHelpOptions";
import AICSLogo from "../../../assets/AICS-logo-white.svg";
import AICSLogoWithName from "../../../assets/AICS-logo-and-name.svg";

import styles from "./Header.module.css";

export default function Header() {
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
            <div className={styles.header}>
                <div className={styles.left}>
                    {/* Toggle logo style per screen size */}
                    <a
                        className={styles.logo}
                        href="https://www.allencell.org/"
                        target="_blank"
                        rel="noreferrer"
                    >
                        <AICSLogo />
                    </a>
                    <a
                        className={styles.logoWithName}
                        href="https://www.allencell.org/"
                        target="_blank"
                        rel="noreferrer"
                    >
                        <AICSLogoWithName />
                    </a>
                    <Link
                        to="/"
                        className={styles.title}
                        target={isApp ? "_blank" : "_self"}
                        rel="noreferrer"
                    >
                        <h4>{APPLICATION_NAME}</h4>
                    </Link>
                </div>
                <Stack
                    reversed
                    horizontal
                    wrap
                    styles={{ root: styles.stack }}
                    tokens={{ childrenGap: 5 }}
                >
                    <Stack.Item styles={{ root: styles.stackItem }}>
                        {currentPath !== "/app" && (
                            <Link to="app">
                                <SecondaryButton
                                    className={styles.startButton}
                                    title="Get started"
                                    text="GET STARTED"
                                />
                            </Link>
                        )}
                    </Stack.Item>
                    <Stack.Item grow styles={{ root: styles.stackItem }}>
                        <div className={styles.right}>
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
                            <PrimaryButton
                                ariaLabel="Help"
                                className={styles.helpMenuButton}
                                styles={{ label: styles.helpMenuLabel }}
                                menuIconProps={{ iconName: "ChevronDown" }}
                                menuProps={helpMenu}
                                text="Help"
                            />
                        </div>
                    </Stack.Item>
                </Stack>
            </div>
        </>
    );
}
