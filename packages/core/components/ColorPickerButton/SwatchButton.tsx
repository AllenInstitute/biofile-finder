import React, { ReactElement } from "react";

import { SecondaryButton } from "../Buttons";

import styles from "./SwatchButton.module.css";

type SwatchButtonProps = {
    /** Current hex color value, *not* prefixed with a `#`. */
    hexColor: string;
    disabled?: boolean;
    onClick?: () => void;
    title?: string;
};

/**
 * Square button displaying a color swatch.
 */
export default function SwatchButton(props: SwatchButtonProps): ReactElement {
    return (
        <div
            style={
                {
                    "--color-picker-color": "#" + props.hexColor,
                } as React.CSSProperties
            }
        >
            <SecondaryButton
                className={styles.colorSwatchButton}
                onClick={props.onClick}
                disabled={props.disabled}
                text=""
                title={props.title}
            ></SecondaryButton>
        </div>
    );
}
