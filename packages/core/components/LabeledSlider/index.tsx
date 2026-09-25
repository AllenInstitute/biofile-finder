import { createTheme, PartialTheme, Slider, SpinButton, ThemeProvider } from "@fluentui/react";
import React, { ReactElement, useCallback } from "react";

import styles from "./LabeledSlider.module.css";

interface LabeledSliderProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min: number;
    max: number;
    step?: number;
    labelWidth?: string;
}

const defaultProps = {
    step: 1,
    labelWidth: "40px",
};

/**
 * Renders a labeled slider component and a spin button for numeric values.
 */
export default function LabeledSlider(props: LabeledSliderProps): ReactElement {
    props = { ...defaultProps, ...props };
    const id = `labeled-slider-${(props.label ?? "").replace(/\s+/g, "-").toLowerCase()}`;

    const { label, value, onChange, min, max, step, labelWidth } = props;

    const onChangeCallback = useCallback(
        (value: number) => {
            value = Math.min(Math.max(value, min), max);
            onChange(value);
        },
        [min, max, onChange]
    );

    const globalStyle = getComputedStyle(document.body);
    const sliderTheme: PartialTheme = createTheme({
        palette: {
            themePrimary: globalStyle.getPropertyValue("--aqua"),
            themeDarker: globalStyle.getPropertyValue("--aqua-darker"),
        },
    });

    return (
        <div className={styles.container}>
            <label htmlFor={id} style={{ width: labelWidth }}>
                {label}
            </label>
            <SpinButton
                id={id}
                className={styles["labeled-slider-input"]}
                value={value.toString()}
                onChange={(_event, value) => onChangeCallback(Number(value))}
                min={min}
                max={max}
                step={step}
            ></SpinButton>
            <div className={styles.sliderContainer}>
                <ThemeProvider theme={sliderTheme}>
                    <Slider
                        value={value}
                        onChange={onChangeCallback}
                        min={min}
                        max={max}
                        step={step}
                        id={id}
                    ></Slider>
                </ThemeProvider>
            </div>
        </div>
    );
}
