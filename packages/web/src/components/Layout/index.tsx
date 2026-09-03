import classNames from "classnames";
import * as React from "react";
import { Outlet, useLocation } from "react-router-dom";

import Header from "../Header";
import Footer from "../Footer";

import styles from "./Layout.module.css";

export default function Layout() {
    const currentPath = useLocation().pathname;
    const isApp: boolean = currentPath == "/app";
    const isDatasets: boolean = currentPath === "/datasets";

    // Reset the scroll container to the top on every route change. React Router's
    // built-in scroll restoration only resets window.scrollY; the app's scroll
    // container is this inner div, so it must be reset manually.
    const scrollRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        scrollRef.current?.scrollTo(0, 0);
    }, [currentPath]);

    return (
        <div className={styles.root}>
            <Header />
            <div
                ref={scrollRef}
                className={classNames(isApp ? styles.fillScreen : styles.scrollable, {
                    [styles.footerClearance]: isDatasets,
                })}
            >
                <Outlet />
                {!isApp && <Footer />}
            </div>
        </div>
    );
}
