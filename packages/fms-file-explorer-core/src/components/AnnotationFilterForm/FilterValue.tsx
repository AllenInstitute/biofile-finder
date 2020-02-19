import * as React from "react";

const styles = require("./ListPicker.module.css");

interface FilterValueProps {
    checked: boolean; // whether this checkbox should be checked
    displayValue: any;
    onChange: React.ChangeEventHandler;
    value: any;
}

export default function FilterValue(props: FilterValueProps) {
    const { checked, displayValue, onChange, value } = props;
    return (
        <label className={styles.item}>
            <input
                className={styles.checkbox}
                type="checkbox"
                role="checkbox"
                name={value}
                value={value}
                checked={checked}
                aria-checked={checked}
                onChange={onChange}
            />
            {displayValue}
        </label>
    );
}
