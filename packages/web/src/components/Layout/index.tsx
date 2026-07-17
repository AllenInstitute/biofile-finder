import classNames from "classnames";
import * as React from "react";
import { Outlet, useLocation } from "react-router-dom";

import Header from "../Header";
import Footer from "../Footer";

import styles from "./Layout.module.css";

// Basic wrapper to maintain global header
export default function Layout() {
    const currentPath = useLocation().pathname;
    const isApp: boolean = currentPath == "/app";
    // The user guide runs its own full-height scroll panels and handles footer
    // clearance internally, so it opts out of the shared footer-clearance padding.
    const isUserGuide: boolean = currentPath.startsWith("/user-guide");
    return (
        <div className={styles.root}>
            <Header />
            <div
                className={classNames(isApp ? styles.fillScreen : styles.scrollable, {
                    [styles.footerClearance]: !isApp && !isUserGuide,
                })}
            >
                <Outlet />
                {!isApp && <Footer />}
            </div>
        </div>
    );
}
