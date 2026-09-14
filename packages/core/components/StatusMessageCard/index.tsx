import * as React from "react";

import styles from "./StatusMessageCard.module.css";

type StatusMessageCardProps = {
    type: "warning" | "error";
};

/** Displays a warning or error message onscreen, as a block of text. */
export default function StatusMessageCard(props: React.PropsWithChildren<StatusMessageCardProps>) {
    return (
        <p className={props.type === "warning" ? styles.warningMessage : styles.errorMessage}>
            {props.children}
        </p>
    );
}
