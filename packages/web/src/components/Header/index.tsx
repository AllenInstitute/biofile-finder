import { DirectionalHint, PrimaryButton, Stack } from "@fluentui/react";
import * as React from "react";
import { useDispatch } from "react-redux";
import { Link, useLocation } from "react-router-dom";

import { APPLICATION_NAME } from "../../constants";
import SiteLogo from "../../../assets/site-logo.png";
import { SecondaryButton, useButtonMenu } from "../../../../core/components/Buttons";
import useHelpOptions from "../../../../core/hooks/useHelpOptions";

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
                <Link
                    to="/"
                    className={styles.title}
                    target={isApp ? "_blank" : "_self"}
                    rel="noreferrer"
                >
                    <img alt="BioFile Finder Logo" height={36} src={SiteLogo} />
                    <div>
                        <h4>{APPLICATION_NAME}</h4>
                        <h6>Powered by BigFile Finder</h6>
                    </div>
                </Link>
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
                                    title="Get started in the app"
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
