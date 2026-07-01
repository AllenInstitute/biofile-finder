import classNames from "classnames";
import * as React from "react";
import { Link } from "react-router-dom";

import { SecondaryButton } from "../../../../../core/components/Buttons";
import { APPLICATION_NAME } from "../../../constants";
import SiteLogo from "../../../../assets/site-logo.png";
import Section from "../Section";
import { INTRO_BODY, LINKS } from "../content";

import styles from "../Home.module.css";

/** Brief lead-in band beneath the hero: brand mark, blurb, and the primary
 *  user-guide and publication CTAs. */
export default function Intro() {
    return (
        <Section
            id="intro"
            ariaLabel={`About ${APPLICATION_NAME}`}
            alt
            className={styles.introContainer}
        >
            <img className={styles.introLogo} src={SiteLogo} alt="" />
            <div>
                <p className={styles.introBody}>
                    {INTRO_BODY} Visit the{" "}
                    <Link to={LINKS.userGuide} className={styles.textLink}>
                        user guide
                    </Link>{" "}
                    or read how BioFile Finder supports scientific workflows in Nature Methods.
                </p>
                <div className={classNames(styles.buttonRow, styles.introButtons)}>
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
            </div>
        </Section>
    );
}
