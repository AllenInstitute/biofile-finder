import { ChoiceGroup, IChoiceGroupOption } from "@fluentui/react";
import * as React from "react";

import styles from "./ChoiceGroup.module.css";

interface Props {
    className?: string;
    disabled?: boolean;
    onChange: (
        ev?: React.FormEvent<HTMLElement | HTMLInputElement>,
        option?: IChoiceGroupOption | undefined
    ) => void;
    options: IChoiceGroupOption[];
    defaultSelectedKey?: string | number;
}

/**
 * Custom styled wrapper for default fluentui component
 */
export default function BaseCheckbox(props: Props) {
    return (
        <ChoiceGroup
            className={props?.className}
            defaultSelectedKey={props?.defaultSelectedKey}
            options={props.options}
            onChange={props.onChange}
            styles={{ root: styles.choiceGroup }}
        />
    );
}
