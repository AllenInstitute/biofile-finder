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
    // when a drag exits the color picker prevents this.
    const isDraggingRef = React.useRef(false);
    const preventFocusLossRef = React.useRef(false);

    useEffect(() => {
        const handleMouseDown = () => {
            isDraggingRef.current = true;
        };
        const handleMouseLeave = () => {
            if (isDraggingRef.current) {
                preventFocusLossRef.current = true;
            }
        };
        const handleMouseEnter = () => {
            if (isDraggingRef.current) {
                preventFocusLossRef.current = false;
            }
        };
        const handleMouseUp = (event: MouseEvent) => {
            if (preventFocusLossRef.current) {
                event.preventDefault();
            }
            if (isDraggingRef.current) {
                isDraggingRef.current = false;
                preventFocusLossRef.current = false;
            }
        };
        const colorPickerContainer = colorPickerContainerRef.current;
        if (colorPickerContainer) {
            colorPickerContainer.addEventListener("mousedown", handleMouseDown);
            colorPickerContainer.addEventListener("mouseleave", handleMouseLeave);
            colorPickerContainer.addEventListener("mouseenter", handleMouseEnter);
        }
        document.body.addEventListener("mouseup", handleMouseUp, {
            capture: true,
        });
        return () => {
            if (colorPickerContainer) {
                colorPickerContainer.removeEventListener("mousedown", handleMouseDown);
                colorPickerContainer.removeEventListener("mouseleave", handleMouseLeave);
                colorPickerContainer.removeEventListener("mouseenter", handleMouseEnter);
            }
            document.body.removeEventListener("mouseup", handleMouseUp, { capture: true });
        };
    }, []);

    const onCalloutDismiss = () => {
        preventFocusLossRef.current = false;
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
                    title={"Select color"}
                ></SwatchButton>
            </div>
            <div className={styles.calloutContainer}>
                <Callout
                    role="dialog"
                    aria-label="Color picker"
                    target={calloutRootRef.current}
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
                                        title={"#" + color}
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
