import React, { ReactElement, useCallback } from "react";

import styles from "./LabeledSlider.module.css";
import { Slider } from "@fluentui/react";

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

    return (
        <div className={styles.container}>
            <label htmlFor={id} style={{ width: labelWidth }}>
                {label}
            </label>

            <form>
                <input
                    id={id}
                    className={styles.input}
                    type="number"
                    value={value}
                    onChange={(e) => onChangeCallback(Number(e.target.value))}
                    min={min}
                    max={max}
                    step={step}
                ></input>
            </form>

            <div className={styles.sliderContainer}>
                <Slider
                    value={value}
                    onChange={onChangeCallback}
                    min={min}
                    max={max}
                    step={step}
                    id={id}
                ></Slider>
            </div>
        </div>
    );
}
