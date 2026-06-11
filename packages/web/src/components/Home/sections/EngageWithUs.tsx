import { Icon } from "@fluentui/react";
import * as React from "react";

import Section from "../Section";
import { ENGAGE_LINKS } from "../content";

import styles from "../Home.module.css";

/**
 * "Engage with us" — outbound links to the support forum, GitHub, and email.
 * Email opens the mail client; web links open in a new tab with an indicator.
 */
export default function EngageWithUs() {
    return (
        <Section id="engage" title="Engage with us" alt className={styles.centeredText}>
            <div className={styles.engageLinks}>
                {ENGAGE_LINKS.map((link) => {
                    const isEmail = link.href.startsWith("mailto:");
                    return (
                        <a
                            key={link.href}
                            className={styles.externalLink}
                            href={link.href}
                            target={isEmail ? undefined : "_blank"}
                            rel="noreferrer"
                            aria-label={isEmail ? link.text : `${link.text} (opens in new tab)`}
                        >
                            {link.text}
                            <Icon
                                className={styles.externalIcon}
                                iconName={isEmail ? "Mail" : "OpenInNewWindow"}
                            />
                        </a>
                    );
                })}
            </div>
        </Section>
    );
}
