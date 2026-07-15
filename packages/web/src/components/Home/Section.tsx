import classNames from "classnames";
import * as React from "react";

import styles from "./Home.module.css";

interface SectionProps {
    /** Stable id used to link the heading to the section landmark. */
    id: string;
    children: React.ReactNode;
    /** Visible H2 heading. Omit for bands that have no heading in the design. */
    title?: string;
    /** Accessible name for the landmark when there is no visible heading. */
    ariaLabel?: string;
    /** Render on the raised/alternate background band. */
    alt?: boolean;
    /** Extra classes for the inner content container. */
    className?: string;
}

/**
 * Full-bleed background band with a centered, width-constrained content
 * container and consistent vertical rhythm. Centralizes the section landmark
 * + heading wiring so every home page section is structured identically and
 * accessibly (one `<section>` with an accessible name, one `<h2>`).
 */
export default function Section(props: SectionProps) {
    const headingId = `${props.id}-heading`;
    return (
        <section
            id={props.id}
            aria-labelledby={props.title ? headingId : undefined}
            aria-label={props.title ? undefined : props.ariaLabel}
            className={classNames(styles.band, { [styles.bandAlt]: props.alt })}
        >
            <div className={classNames(styles.container, props.className)}>
                {props.title && (
                    <h2 id={headingId} className={styles.sectionHeading}>
                        {props.title}
                    </h2>
                )}
                {props.children}
            </div>
        </section>
    );
}
