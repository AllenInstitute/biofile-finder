import { DefaultButton } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import HelpMenu from "./Help";
import { APPLICATION_NAME } from "../../constants";
import AICSLogo from "../../../assets/AICS-logo-and-name.svg";

import styles from "./Header.module.css";

export default function Header() {
    const navigate = useNavigate();
    const currentPath = useLocation().pathname;
    const isApp: boolean = currentPath == "/app";

    return (
        <>
            <div className={styles.header}>
                <div className={styles.left}>
                    <a href="https://www.allencell.org/" target="_blank" rel="noreferrer">
                        <AICSLogo />
                    </a>
                    <div className={styles.headerOption}>|</div>
                    <Link
                        to={"/"}
                        className={styles.title}
                        target={isApp ? "_blank" : "_self"}
                        rel="noreferrer"
                    >
                        {APPLICATION_NAME}
                    </Link>
                </div>
                <div className={styles.right}>
                    <Link
                        to={"datasets"}
                        className={classNames(styles.routeLink, styles.headerOption)}
                        target={isApp ? "_blank" : "_self"}
                        rel="noreferrer"
                    >
                        Open-source datasets
                    </Link>
                    <HelpMenu path={currentPath} />
                    {currentPath !== "/app" && (
                        <DefaultButton
                            className={classNames(styles.uploadButton, styles.headerOption)}
                            styles={{ label: styles.uploadButtonLabel }}
                            ariaLabel="Get started"
                            onClick={() => navigate("/app")}
                            title="Get started"
                            text="START"
                        />
                    )}
                </div>
            </div>
        </>
    );
}
