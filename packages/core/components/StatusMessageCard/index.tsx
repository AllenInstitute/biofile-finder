import * as React from "react";

import styles from "./StatusMessageCard.module.css";

type StatusMessageCardProps = {
    type: "warning" | "error";
};

/** Displays a warning or error message onscreen, as a block of text. */
export default function StatusMessageCard(props: React.PropsWithChildren<StatusMessageCardProps>) {
    return (
        <p
            // Use alert role for errors, and aria-live for warnings.
            aria-live={props.type === "warning" ? "polite" : undefined}
            role={props.type === "error" ? "alert" : undefined}
            className={props.type === "warning" ? styles.warningMessage : styles.errorMessage}
        >
            {props.children}
        </p>
    );
}
