import { DirectionalHint, PrimaryButton } from "@fluentui/react";
import * as React from "react";
import { useDispatch } from "react-redux";
import { Link, useLocation } from "react-router-dom";

import { APPLICATION_NAME } from "../../constants";
import { SecondaryButton, useButtonMenu } from "../../../../core/components/Buttons";
import useHelpOptions from "../../../../core/hooks/useHelpOptions";
import AICSLogo from "../../../assets/AICS-logo-and-name.svg";

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
                    <a href="https://www.allencell.org/" target="_blank" rel="noreferrer">
                        <AICSLogo />
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
                <div className={styles.right}>
                    <Link
                        to="datasets"
                        className={styles.routeLink}
                        target={isApp ? "_blank" : "_self"}
                        rel="noreferrer"
                    >
                        Open-source datasets
                    </Link>
                    <PrimaryButton
                        ariaLabel="Help"
                        className={styles.helpMenuButton}
                        styles={{ label: styles.helpMenuLabel }}
                        menuIconProps={{ iconName: "ChevronDown" }}
                        menuProps={helpMenu}
                        text="Help"
                    />
                    {currentPath !== "/app" && (
                        <Link to="app">
                            <SecondaryButton
                                className={styles.startButton}
                                title="Get started"
                                text="GET STARTED"
                            />
                        </Link>
                    )}
                </div>
            </div>
        </>
    );
}
