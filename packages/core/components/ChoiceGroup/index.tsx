import { ChoiceGroup, IChoiceGroupOption } from "@fluentui/react";
import * as React from "react";

import Tooltip from "../Tooltip";

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
export default function BaseChoiceGroup(props: Props) {
    return (
        <ChoiceGroup
            className={props?.className}
            defaultSelectedKey={props?.defaultSelectedKey}
            options={props.options.map((option) => {
                return {
                    ...option,
                    onRenderField: (optionProps, defaultRender) => {
                        if (optionProps && defaultRender) {
                            return (
                                <Tooltip content={optionProps.title}>
                                    {defaultRender(optionProps) || <></>}
                                </Tooltip>
                            );
                        }
                        return <></>;
                    },
                };
            })}
            onChange={props.onChange}
            styles={{ root: styles.choiceGroup }}
        />
    );
}
