import * as React from "react";
import { useRouteError } from "react-router";

import styles from "./ErrorPage.module.css";

/**
 * Error page for displaying an uncaught failure in the application
 */
export default function ErrorPage() {
    const error = useRouteError() as Error | undefined;

    return (
        <div className={styles.container}>
            <h1>Uh oh!</h1>
            <p>
                An unexpected error has bubbled up, we are not sure exactly what went wrong, but
                below is the error we caught.
                <br />
                Navigate to the Help tab on the{" "}
                <a
                    href="https://bff.allencell.org"
                    target="_blank"
                    title="BioFile Finder homepage"
                    rel="noreferrer"
                >
                    homepage
                </a>{" "}
                for options on getting in contact with us.
            </p>
            <div className={styles.error}>
                <h3>Error</h3>
                <p>{error?.message || "Unknown error"}</p>
            </div>
        </div>
    );
}
