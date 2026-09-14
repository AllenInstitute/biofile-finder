import * as React from "react";

import styles from "./StatusMessageCard.module.css";

/** Displays a warning or error message onscreen, as a block of text. */
export default function StatusMessageCard({
    type,
    children,
}: {
    type: "warning" | "error";
    children: React.ReactNode;
}) {
    return (
        <p className={type === "warning" ? styles.warningMessage : styles.errorMessage}>
            {children}
        </p>
    );
}
