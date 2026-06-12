import * as React from "react";

import Modal from "../../../../core/components/Modal";
import EngageWithUs from "./sections/EngageWithUs";
import GetStarted from "./sections/GetStarted";
import Hero from "./sections/Hero";
import HowItWorks from "./sections/HowItWorks";
import Intro from "./sections/Intro";
import PublicationCallout from "./sections/PublicationCallout";
import WhatNext from "./sections/WhatNext";
import WhyBioFileFinder from "./sections/WhyBioFileFinder";

import styles from "./Home.module.css";

/**
 * Public-facing splash page. This is static marketing content with no data
 * fetching, so there are no loading/empty/error states to model here; the
 * `PlaceholderImage` component represents assets that are not yet available.
 * Each section is its own component, composed top-to-bottom in design order.
 */
export default function Home() {
    return (
        <div className={styles.root}>
            <Hero />
            <Intro />
            <WhyBioFileFinder />
            <PublicationCallout />
            <HowItWorks />
            <GetStarted />
            <WhatNext />
            <EngageWithUs />
            {/* Shared modal host (kept consistent with other public pages). */}
            <Modal />
        </div>
    );
}
