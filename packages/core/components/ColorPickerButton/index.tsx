import { Callout, ColorPicker } from "@fluentui/react";
import React, { ReactElement, useEffect, useState } from "react";

import SwatchButton from "./SwatchButton";
import { PrimaryButton } from "../Buttons";

import styles from "./ColorPickerButton.module.css";

const DEFAULT_PALETTE = ["ffffff", "ff0000", "ffff00", "00ff00", "00ffff", "0000ff", "ff00ff"];

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
    const colorPickerContainerRef = React.useRef<HTMLDivElement>(null);

    // Handles a bug where, when clicking and dragging on the color picker,
    // releasing the mouse while outside the color picker would cause a parent
    // callout to dismiss. Disabling the default behavior (changing focus)
    // when drags exit the color picker prevents this.
    const isDraggingRef = React.useRef(false);
    const [preventFocusLoss, setPreventFocusLoss] = useState(false);

    useEffect(() => {
        const handleMouseDown = () => {
            isDraggingRef.current = true;
        };
        const handleMouseExit = () => {
            if (isDraggingRef.current) {
                setPreventFocusLoss(true);
            }
        };
        const handleMouseUp = (event: MouseEvent) => {
            if (preventFocusLoss) {
                // Prevent focus loss when a click was initiated inside the
                // color picker callout and then dragged outside.
                event.preventDefault();
            }
            if (isDraggingRef.current) {
                isDraggingRef.current = false;
                setPreventFocusLoss(false);
            }
        };
        const colorPickerContainer = colorPickerContainerRef.current;
        if (colorPickerContainer) {
            colorPickerContainer.addEventListener("mousedown", handleMouseDown);
            colorPickerContainer.addEventListener("mouseleave", handleMouseExit);
        }
        document.body.addEventListener("mouseup", handleMouseUp, {
            capture: true,
        });
        return () => {
            if (colorPickerContainer) {
                colorPickerContainer.removeEventListener("mousedown", handleMouseDown);
                colorPickerContainer.removeEventListener("mouseleave", handleMouseExit);
            }
            document.body.removeEventListener("mouseup", handleMouseUp, { capture: true });
        };
    }, [preventFocusLoss]);

    const onCalloutDismiss = () => {
        setPreventFocusLoss(false);
        isDraggingRef.current = false;
        setIsCalloutVisible(false);
    };

    return (
        <>
            <div ref={calloutRootRef}>
                <SwatchButton
                    hexColor={props.hexColor}
                    disabled={props.disabled}
                    onClick={() => setIsCalloutVisible(!isCalloutVisible)}
                    title={"Select color (current color is #" + props.hexColor + ")"}
                ></SwatchButton>
            </div>
            <div>
                <Callout
                    role="dialog"
                    aria-label="Select color"
                    target={calloutRootRef.current}
                    // TODO: Some layers of the callout still have a white BG color,
                    // which causes some edge artifacts. Make a separate dark theme
                    // component to handle callouts across the app.
                    backgroundColor="var(--primary-background-color)"
                    hidden={props.disabled || !isCalloutVisible}
                    onDismiss={onCalloutDismiss}
                    doNotLayer={true}
                >
                    <div className={styles.colorPickerContainer} ref={colorPickerContainerRef}>
                        <ColorPicker
                            color={"#" + props.hexColor}
                            onChange={(_e, color) => props.onChange(color.hex)}
                            alphaType="none"
                        ></ColorPicker>

                        <div className={styles.swatchContainer}>
                            {DEFAULT_PALETTE.map((color, index) => {
                                return (
                                    <SwatchButton
                                        hexColor={color}
                                        key={index}
                                        onClick={() => props.onChange(color)}
                                        title={"Select color #" + color}
                                    />
                                );
                            })}
                        </div>

                        <PrimaryButton
                            className={styles.colorPickerDoneButton}
                            text="Done"
                            onClick={() => setIsCalloutVisible(false)}
                        ></PrimaryButton>
                    </div>
                </Callout>
            </div>
        </>
    );
}
