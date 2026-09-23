import { Checkbox as FluentCheckbox } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import styles from "./Checkbox.modules.css";

interface Props {
    id?: string;
    className?: string;
    disabled?: boolean;
    initialValue?: boolean;
    onChange: (ev?: React.FormEvent<HTMLElement | HTMLInputElement>, isCheckedEv?: boolean) => void;
    label: string;
    checked?: boolean;
    indeterminate?: boolean;
    title?: string;
}

/**
 * Custom styled wrapper for default fluentui component
 */
export default function Checkbox(props: Props) {
    const [isChecked, setChecked] = React.useState(!!props.initialValue); // defaults to false

    function onCheckboxChange(
        ev?: React.FormEvent<HTMLElement | HTMLInputElement>,
        isCheckedEv?: boolean
    ) {
        setChecked(!!isCheckedEv);
        props?.onChange(ev, !!isCheckedEv);
    }

    return (
        <FluentCheckbox
            id={props.id}
            checked={props.checked ?? isChecked}
            indeterminate={props.indeterminate}
            className={classNames(props.className, {
                [styles.disabled]: props.disabled,
                [styles.checked]: props.checked ?? isChecked,
                [styles.indeterminate]: props.indeterminate,
            })}
            styles={{
                label: styles.label,
                root: styles.root,
                checkbox: styles.checkbox,
                checkmark: styles.checkmark,
            }}
            label={props.label}
            title={props.title}
            disabled={props?.disabled}
            onChange={onCheckboxChange}
        />
    );
}
