import { Callout, ColorPicker } from "@fluentui/react";
import React, { ReactElement, useState } from "react";

import { SecondaryButton } from "../Buttons";

import styles from "./ColorPickerButton.module.css";

type ColorPickerButtonProps = {
    /** Current hex color value, *not* prefixed with a `#`. */
    hexColor: string;
    onChange: (hexColor: string) => void;
    disabled?: boolean;
};

/**
 * Renders a color picker button that opens a color picker callout on click.
 */
export default function ColorPickerButton(props: ColorPickerButtonProps): ReactElement {
    const [isCalloutVisible, setIsCalloutVisible] = useState(false);
    const calloutRootRef = React.useRef<HTMLDivElement>(null);

    return (
        <>
            <div ref={calloutRootRef}>
                <div
                    style={
                        {
                            "--color-picker-color": "#" + props.hexColor,
                        } as React.CSSProperties
                    }
                >
                    <SecondaryButton
                        className={styles.colorPickerButton}
                        onClick={() => setIsCalloutVisible(!isCalloutVisible)}
                        disabled={props.disabled}
                        text=""
                    ></SecondaryButton>
                </div>
            </div>
            <Callout
                role="dialog"
                target={calloutRootRef.current}
                // TODO: Some layers of the callout still have a white BG color,
                // which causes some edge artifacts. Make a separate dark theme
                // component to handle callouts across the app.
                backgroundColor="var(--primary-background-color)"
                hidden={props.disabled || !isCalloutVisible}
                // TODO: There's a bug where clicking and dragging off the edge
                // of the color picker causes the dismiss callout to be
                // triggered. One solution would be to disable the dismiss
                // behavior if the mouse exits the callout.
                onDismiss={() => setIsCalloutVisible(false)}
            >
                <div className={styles.colorPickerContainer}>
                    <ColorPicker
                        color={"#" + props.hexColor}
                        onChange={(_e, color) => props.onChange(color.hex)}
                        alphaType="none"
                    ></ColorPicker>
                </div>
            </Callout>
        </>
    );
}
