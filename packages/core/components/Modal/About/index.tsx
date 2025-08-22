import * as React from "react";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import AICSLogo from "../../../icons/aics-logo.svg";

import styles from "./About.module.css";

/**
 * Dialog meant to show high-level info about BFF
 */
export default function About({ onDismiss }: ModalProps) {
    const body = (
        <>
            <p>
                BioFile Finder is an open‑use web application developed by the Allen Institute for
                Cell Science, designed to streamline how you search, access, and visualize imaging
                datasets. With powerful metadata search, filtering, and sorting capabilities, you
                can easily locate datasets and view them directly in industry-standard tools—or
                explore them immediately in your browser using the integrated 3D Volume Viewer.
                Whether you&apos;re working with programmatic workflows or manual exploration,
                BioFile Finder simplifies the process of organizing and accessing imaging data.
            </p>
            <h3>Contributors & Sponsors</h3>
            <div className={styles.logoContainer}>
                <AICSLogo />
            </div>
            <h4>Want to become a contributor or sponsor?</h4>
            <p>
                To contribute,
                <a
                    href="https://github.com/AllenInstitute/biofile-finder"
                    className={styles.link}
                    target="_blank"
                    rel="noreferrer"
                >
                    {" "}
                    visit our GitHub page{" "}
                </a>
                and either submit a feature or reach out to us.
            </p>
            <p>
                To sponsor, reach out to us at
                <a href="mailto:aics_software_support@alleninstitute.org" className={styles.link}>
                    {" "}
                    aics_software_support@alleninstitute.org
                </a>
                .
            </p>
        </>
    );

    return <BaseModal body={body} onDismiss={onDismiss} title="About" />;
}
