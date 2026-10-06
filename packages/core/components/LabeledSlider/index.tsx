import { createTheme, PartialTheme, Slider, SpinButton, ThemeProvider } from "@fluentui/react";
import classNames from "classnames";
import React, { ReactElement, useCallback } from "react";

import styles from "./LabeledSlider.module.css";

interface LabeledSliderProps {
    className?: string;
    // TODO: use useId hook in React 18 and above instead of requiring ID
    id: string;
    label: string;
    value: number;
    onChange: (value: number) => void;
    min: number;
    max: number;
    step?: number;
    labelWidth?: string;
    labelFormatter?: (value: number) => string;
}

const defaultProps = {
    step: 1,
    labelWidth: "40px",
};

/**
 * Renders a label, a slider, and a spin button for inputting and editing
 * numeric values.
 */
export default function LabeledSlider(props: LabeledSliderProps): ReactElement {
    props = { ...defaultProps, ...props };

    const { label, value, onChange, min, max, step, labelWidth } = props;

    const onChangeCallback = useCallback(
        (value: number) => {
            if (!Number.isFinite(value)) {
                return;
            }
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
        <div className={classNames([styles.container, props.className])}>
            <label htmlFor={props.id} style={{ width: labelWidth }}>
                {label}
            </label>
            <SpinButton
                inputProps={{ id: props.id }}
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
                    ></Slider>
                </ThemeProvider>
                <div className={styles.sliderRangeLabelContainer}>
                    <span>{props.labelFormatter ? props.labelFormatter(min) : min}</span>
                    <span>{props.labelFormatter ? props.labelFormatter(max) : max}</span>
                </div>
            </div>
        </div>
    );
}
