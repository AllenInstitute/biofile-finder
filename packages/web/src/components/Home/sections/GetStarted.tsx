import * as React from "react";
import { Link } from "react-router-dom";

import { SecondaryButton } from "../../../../../core/components/Buttons";
import LaunchAppMenu from "../../LaunchAppMenu";
import Section from "../Section";
import { LINKS } from "../content";

import styles from "../Home.module.css";

/** "How do I get started?" — guidance summary plus guide + launch CTAs. */
export default function GetStarted() {
    return (
        <Section id="get-started" title="How do I get started?" alt className={styles.centeredText}>
            <p className={styles.lead}>
                Provide a data source by uploading a BioFile Finder compatible spreadsheet (CSV,
                Parquet, or JSON) containing metadata annotations associated with your image files.
                The only required key-value pair is &ldquo;File Path&rdquo; and URLs pointing to
                dataset location(s).
            </p>
            <div className={styles.buttonRow}>
                {/* TODO(user-guide): repoint to the user guide once that branch merges. */}
                <Link to={LINKS.userGuide}>
                    <SecondaryButton className={styles.ctaButton} text="Read guidance" />
                </Link>
                <LaunchAppMenu className={styles.ctaButton} />
            </div>
        </Section>
    );
}
