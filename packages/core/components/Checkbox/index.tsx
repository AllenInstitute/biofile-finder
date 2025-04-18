import { Checkbox } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import styles from "./Checkbox.modules.css";

interface Props {
    className?: string;
    disabled?: boolean;
    initialValue?: boolean;
    onChange: (ev?: React.FormEvent<HTMLElement | HTMLInputElement>, isCheckedEv?: boolean) => void;
    label: string;
}

/**
 * Custom styled wrapper for default fluentui component
 */
export default function BaseCheckbox(props: Props) {
    const [isChecked, setChecked] = React.useState(!!props.initialValue); // defaults to false
    function onCheckboxChange(
        ev?: React.FormEvent<HTMLElement | HTMLInputElement>,
        isCheckedEv?: boolean
    ) {
        setChecked(!!isCheckedEv);
        props?.onChange(ev, !!isCheckedEv);
    }
    return (
        <Checkbox
            checked={isChecked}
            className={classNames(props.className, {
                [styles.disabled]: props.disabled,
                [styles.checked]: isChecked,
            })}
            styles={{
                label: styles.label,
                root: styles.root,
                checkbox: styles.checkbox,
                checkmark: styles.checkmark,
            }}
            label={props.label}
            disabled={props?.disabled}
            onChange={onCheckboxChange}
        />
    );
}
