import classNames from "classnames";
import * as React from "react";

import { SecondaryButton } from "../../../../../core/components/Buttons";
import PlaceholderImage from "../PlaceholderImage";
import Section from "../Section";
import { LINKS } from "../content";

import styles from "../Home.module.css";

/** Screenshot + Nature Methods citation with a link out to the publication. */
export default function PublicationCallout() {
    return (
        <Section id="publication" ariaLabel="Published research">
            <PlaceholderImage
                ariaLabel="Screenshot of the BioFile Finder app exploring a dataset"
                className={classNames(styles.wideImage)}
            />
            <p className={styles.caption}>
                See how BioFile Finder supports scientific workflows in Nature Methods
            </p>
            <div className={styles.buttonRow}>
                <a
                    href={LINKS.publication}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Read publication (opens in new tab)"
                >
                    <SecondaryButton
                        className={styles.ctaButton}
                        iconName="OpenInNewWindow"
                        iconPosition="after"
                        text="Read publication"
                    />
                </a>
            </div>
        </Section>
    );
}
