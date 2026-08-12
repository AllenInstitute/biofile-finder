import * as React from "react";
import { Link } from "react-router-dom";

import { PrimaryButton } from "../../../../../core/components/Buttons";
import Section from "../Section";
import { LINKS } from "../content";

import styles from "../Home.module.css";

/** "How do I get started?" — guidance summary plus guide + launch CTAs. */
export default function GetStarted() {
    return (
        <Section id="get-started" title="How do I get started?" alt className={styles.centeredText}>
            <p className={styles.lead}>
                A metadata file is a structured file (CSV, Parquet, or JSON) that describes your
                dataset and tells BioFile Finder where to find the files you want to explore. To get
                started, prepare a metadata file describing your files and load it into the app.
                BioFile Finder turns that metadata into an interactive interface for filtering,
                grouping, searching, previewing, and sharing.
            </p>
            <div className={styles.buttonRow}>
                <Link to={LINKS.userGuideSetupOverview}>
                    <PrimaryButton className={styles.ctaButton} text="Read detailed guidance" />
                </Link>
            </div>
        </Section>
    );
}
