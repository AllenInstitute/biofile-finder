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
    // The home page's last section (EngageWithUs) carries its own footer-clearance
    // bottom padding so its background fills the gap above the fixed cookie footer.
    const isHome: boolean = currentPath === "/";

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
                    [styles.footerClearance]: !isApp && !isUserGuide && !isHome,
                })}
            >
                <Outlet />
                {!isApp && <Footer />}
            </div>
        </div>
    );
}
