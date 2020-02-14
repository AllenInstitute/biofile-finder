import * as React from "react";

const styles = require("./AnnotationFilterForm.module.css");

interface FilterValueProps {
    onChange: React.ChangeEventHandler;
    value: any;
    checked: boolean; // whether this checkbox should be checked
}

export default function FilterValue(props: FilterValueProps) {
    const { value, checked, onChange } = props;
    return (
        <label className={styles.item}>
            <input
                type="checkbox"
                role="checkbox"
                name={value}
                value={value}
                checked={checked}
                aria-checked={checked}
                onChange={onChange}
            />
            {value}
        </label>
    );
}
