import classNames from "classnames";
import * as React from "react";
import { Link } from "react-router-dom";

import { SecondaryButton } from "../../../../../core/components/Buttons";
import InfoCard from "../InfoCard";
import Section from "../Section";
import { NEXT_CARDS, ActionCard } from "../content";

import styles from "../Home.module.css";

/** Renders an action card's CTA as an internal Link or external anchor. */
function CardAction(cta: ActionCard["cta"]) {
    const button = (
        <SecondaryButton className={styles.ctaButton} text={cta.text} title={cta.text} />
    );
    if (cta.external) {
        return (
            <a
                href={cta.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`${cta.text} (opens in new tab)`}
            >
                {button}
            </a>
        );
    }
    return <Link to={cta.href}>{button}</Link>;
}

/** "What would you like to do next?" — three routes forward, each with a CTA. */
export default function WhatNext() {
    return (
        <Section id="next" title="What would you like to do next?">
            <div className={classNames(styles.cardGrid, styles.cardGrid3)}>
                {NEXT_CARDS.map((card) => (
                    <InfoCard
                        key={card.title}
                        heading={card.title}
                        body={card.body}
                        action={CardAction(card.cta)}
                    />
                ))}
            </div>
        </Section>
    );
}
