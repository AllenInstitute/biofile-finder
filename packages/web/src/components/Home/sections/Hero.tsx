import * as React from "react";

import { PrimaryButton } from "../../../../../core/components/Buttons";
import { APPLICATION_NAME } from "../../../constants";
import { LINKS } from "../content";

import styles from "../Home.module.css";

/**
 * Full-bleed hero banner with the page's single H1, tagline, and primary
 * call-to-action that launches the app pre-loaded with an example dataset.
 */
export default function Hero() {
    return (
        <section className={styles.hero} aria-label={`${APPLICATION_NAME} introduction`}>
            <div className={styles.heroContent}>
                <h1 className={styles.heroTitle}>{APPLICATION_NAME}</h1>
                <p className={styles.heroTagline}>Find, explore, and share data—faster.</p>
                <div className={styles.heroCta}>
                    <PrimaryButton
                        className={styles.ctaButton}
                        iconName="Forward"
                        iconPosition="after"
                        text="Open live example"
                        title="Launch BioFile Finder with an example dataset"
                        onClick={() => window.open(LINKS.tryNow, "_blank", "noopener,noreferrer")}
                    />
                </div>
            </div>
        </section>
    );
}
