import classNames from "classnames";
import * as React from "react";

import InfoCard from "../InfoCard";
import Section from "../Section";
import { HOW_CARDS, HOW_GRAPHIC, HOW_SUBTITLE } from "../content";

import styles from "../Home.module.css";

/** "How does BioFile Finder work?" — explanatory cards plus a flow diagram. */
export default function HowItWorks() {
    return (
        <Section id="how" title="How does BioFile Finder work?" subtitle={HOW_SUBTITLE}>
            <div className={classNames(styles.cardGrid, styles.cardGrid2)}>
                {HOW_CARDS.map((card) => (
                    <InfoCard
                        key={card.accent}
                        accent={card.accent}
                        heading={card.heading}
                        body={card.body}
                    />
                ))}
            </div>
            <img
                src={HOW_GRAPHIC}
                alt="Diagram of how BioFile Finder links metadata to distributed files and downstream tools"
                className={classNames(styles.wideImage, styles.imageAfterGrid)}
            />
        </Section>
    );
}
