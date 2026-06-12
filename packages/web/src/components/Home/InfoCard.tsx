import classNames from "classnames";
import * as React from "react";

import styles from "./InfoCard.module.css";

interface InfoCardProps {
    /**
     * Emphasized lead-in phrase rendered in the accent color before the
     * heading (e.g. "Reduce time"). Omit for a plain title.
     */
    accent?: string;
    /** Heading text. Follows the accent phrase inline when one is provided. */
    heading: React.ReactNode;
    body: React.ReactNode;
    /** Optional call-to-action (e.g. a button) rendered at the foot of the card. */
    action?: React.ReactNode;
    className?: string;
}

/**
 * Reusable content card. Powers every card grid on the home page (the "Why",
 * "How it works", and "What's next" sections) so the container, heading, and
 * spacing stay defined once.
 */
export default function InfoCard(props: InfoCardProps) {
    return (
        <div className={classNames(styles.card, props.className)}>
            <h3 className={styles.heading}>
                {props.accent && <span className={styles.accent}>{props.accent} </span>}
                {props.heading}
            </h3>
            <p className={styles.body}>{props.body}</p>
            {props.action && <div className={styles.action}>{props.action}</div>}
        </div>
    );
}
