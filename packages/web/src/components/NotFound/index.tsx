import * as React from "react";
import { Link } from "react-router-dom";

import styles from "./NotFound.module.css";

interface Props {
    isUserGuide?: boolean;
}

export default function NotFound({ isUserGuide }: Props) {
    return (
        <div className={styles.container}>
            <h2>Oops! We could not find the page you were looking for.</h2>
            <p>The page may have been moved, deleted, or the URL may be incorrect.</p>
            {isUserGuide ? (
                <p>
                    It looks like you were trying to navigate to a user-guide page.
                    <Link to="/user-guide" style={{ textDecoration: "underline", color: "blue" }}>
                        Click here to go back to the user guide home.
                    </Link>
                </p>
            ) : (
                <p>
                    Try out the&nbsp;
                    <Link to="/" style={{ textDecoration: "underline", color: "blue" }}>
                        home page
                    </Link>
                    .
                </p>
            )}
        </div>
    );
}
