import classNames from "classnames";
import * as React from "react";

import InfoCard from "../InfoCard";
import PlaceholderImage from "../PlaceholderImage";
import Section from "../Section";
import { WHY_CARDS } from "../content";

import styles from "../Home.module.css";

/** "Why BioFile Finder?" — a 2x2 grid of value-proposition cards, closing with
 *  a wide app screenshot beneath the grid. */
export default function WhyBioFileFinder() {
    return (
        <Section id="why" title="Why BioFile Finder?">
            <div className={classNames(styles.cardGrid, styles.cardGrid2)}>
                {WHY_CARDS.map((card) => (
                    <InfoCard
                        key={card.accent}
                        accent={card.accent}
                        heading={card.heading}
                        body={card.body}
                    />
                ))}
            </div>
            <PlaceholderImage
                ariaLabel="Screenshot of the BioFile Finder app exploring a dataset"
                className={classNames(styles.wideImage, styles.imageAfterGrid)}
            />
        </Section>
    );
}
