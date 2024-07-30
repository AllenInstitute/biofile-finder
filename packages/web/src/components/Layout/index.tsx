import * as React from "react";
import { Outlet } from "react-router-dom";

import Header from "../Header";
import Footer from "../Footer";

import styles from "./Layout.module.css";

// Basic wrapper to maintain global header
export default function Layout() {
    return (
        <div className={styles.root}>
            <Header />
            <div className={styles.scrollable}>
                <Outlet />
                <Footer />
            </div>
        </div>
    );
}
