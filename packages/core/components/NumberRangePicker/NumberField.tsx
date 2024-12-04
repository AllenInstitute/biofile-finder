import classNames from "classnames";
import * as React from "react";

import styles from "./NumberField.module.css";

interface NumberFieldProps {
    className?: string;
    defaultValue?: string | number;
    id: string;
    label?: string;
    max?: number;
    min?: number;
    onChange: (event?: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
}

/**
 * A simple wrapper to provide a consistently styled numerical input field.
 * FluentUI does not have an equivalent that fulfills our UX requirements,
 * so we instead use the basic html input with styling applied
 */
export default function NumberField(props: NumberFieldProps) {
    return (
        <div className={classNames(props.className, styles.inputField)}>
            {props.label && <label htmlFor={props.id}>{props.label}</label>}
            <input
                data-testid={props.id}
                id={props.id}
                type="number"
                value={props.defaultValue}
                step="any"
                onChange={props.onChange}
                placeholder={props?.placeholder}
                min={props?.min}
                max={props?.max}
            />
        </div>
    );
}
