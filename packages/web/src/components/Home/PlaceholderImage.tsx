import classNames from "classnames";
import * as React from "react";

import styles from "./PlaceholderImage.module.css";

interface PlaceholderImageProps {
    /** Describes the image that will eventually replace this placeholder. */
    ariaLabel: string;
    className?: string;
    /** Visible text; defaults to "PLACEHOLDER IMAGE". */
    label?: string;
}

/**
 * Accessible stand-in for an image that has not been provided yet. Exposed as
 * an `img` role so assistive tech announces it as an image with a meaningful
 * name. When real assets land, swap usages for an `<img>` (and this component
 * can serve as the `onError` fallback).
 */
export default function PlaceholderImage(props: PlaceholderImageProps) {
    return (
        <div
            role="img"
            aria-label={props.ariaLabel}
            className={classNames(styles.placeholder, props.className)}
        >
            <span className={styles.label}>{props.label ?? "Placeholder image"}</span>
        </div>
    );
}
