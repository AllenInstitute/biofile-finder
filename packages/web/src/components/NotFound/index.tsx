import * as React from "react";
import { Link } from "react-router-dom";

import styles from "./NotFound.module.css";

export default function NotFound() {
    return (
        <div className={styles.container}>
            <h1>Looking for something?</h1>
            <p>
                Sorry, we could not find the page you are looking for. One of the following BioFile
                Finder (BFF) related pages may help you get back on track:
            </p>
            <ul>
                <li>
                    <Link to="/">Home</Link>
                </li>
                <li>
                    <Link to="/user-guide">User Guide</Link>
                </li>
            </ul>
            <p>
                <a href="mailto:aics_software_support@alleninstitute.org">Email us</a> if you have
                any questions or issues.
            </p>
        </div>
    );
}
