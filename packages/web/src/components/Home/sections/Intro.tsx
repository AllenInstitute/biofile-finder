import * as React from "react";
import { Link } from "react-router-dom";

import { APPLICATION_NAME } from "../../../constants";
import SiteLogo from "../../../../assets/site-logo.png";
import Section from "../Section";
import { INTRO_BODY, LINKS } from "../content";

import styles from "../Home.module.css";

/** Brief lead-in band beneath the hero, with the brand mark and a guide link. */
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
                <p className={styles.introBody}>{INTRO_BODY}</p>
                {/* TODO(user-guide): repoint to the user guide once that branch merges. */}
                <Link to={LINKS.userGuide} className={styles.textLink}>
                    Visit the user guide to learn more
                </Link>
            </div>
        </Section>
    );
}
