import * as React from "react";
import { Link, useLocation } from "react-router-dom";

import Menu from "./Menu";
import { APPLICATION_NAME } from "../../constants";
import SiteLogo from "../../../assets/site-logo.png";

import styles from "./Header.module.css";

export default function Header() {
    const currentPath = useLocation().pathname;
    const isApp: boolean = currentPath == "/app";

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
                <Menu />
            </div>
        </>
    );
}
