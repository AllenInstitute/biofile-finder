import classNames from "classnames";
import * as React from "react";

import styles from "./InfoCard.module.css";

interface InfoCardProps {
    /** Lead-in phrase before the heading (e.g. "Reduce time"). */
    accent?: string;
    /** Heading text. Follows the accent phrase inline when one is provided. */
    heading: React.ReactNode;
    body: React.ReactNode;
    /**
     * Optional graphic rendered above the heading. Set `icon` for small,
     * fixed-height marks (e.g. SVG icons); omit it for full-width screenshots.
     * `src` is a URL string for raster images or a React component for SVGs
     * (react-svg-loader compiles SVGs to React components, not URL strings).
     */
    image?: {
        src: string | React.FC<React.SVGProps<SVGSVGElement>>;
        alt: string;
        icon?: boolean;
    };
    /** Optional call-to-action (e.g. a button) rendered at the foot of the card. */
    action?: React.ReactNode;
    className?: string;
}

/**
 * Reusable content card. Powers every card grid on the home page (the "Why",
 * "How it works", and "What's next" sections) so the container, heading, and
 * spacing stay defined once.
 */
export default function InfoCard(props: InfoCardProps) {
    // SVGs loaded via react-svg-loader are React components, not URL strings.
    // Render them as JSX; fall back to <img> for raster (PNG) sources.
    let imageEl: React.ReactNode = null;
    if (props.image) {
        const imgClass = classNames(styles.image, { [styles.imageIcon]: props.image.icon });
        if (typeof props.image.src === "string") {
            imageEl = <img src={props.image.src} alt={props.image.alt} className={imgClass} />;
        } else {
            const SvgIcon = props.image.src;
            imageEl = <SvgIcon aria-label={props.image.alt} role="img" className={imgClass} />;
        }
    }

    return (
        <div className={classNames(styles.card, props.className)}>
            {imageEl}
            <h3 className={styles.heading}>
                {props.accent && `${props.accent} `}
                {props.heading}
            </h3>
            <p className={styles.body}>{props.body}</p>
            {props.action && <div className={styles.action}>{props.action}</div>}
        </div>
    );
}
