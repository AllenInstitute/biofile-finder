import { ComboBox, IComboBoxOption, IRenderFunction, ISelectableOption } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import styles from "./ComboBox.module.css";

interface Props {
    className?: string;
    selectedKey?: string;
    disabled?: boolean;
    label: string;
    multiSelect?: boolean;
    options: IComboBoxOption[];
    placeholder: string;
    onChange?: (option: IComboBoxOption | undefined, value?: string | undefined) => void;
}

/**
 * Custom styled wrapper for default fluentui component
 */
export default function BaseComboBox(props: Props) {
    const { options, label, placeholder } = props;

    const onRenderItem = (
        itemProps: ISelectableOption | undefined,
        defaultRender: IRenderFunction<ISelectableOption> | undefined
    ): JSX.Element => {
        if (itemProps && defaultRender) {
            return (
                <span
                    key={`${itemProps.key}-${itemProps.index}`}
                    className={classNames(styles.comboBoxItem, {
                        [styles.comboBoxItemDisabled]: !!itemProps.disabled,
                        [styles.comboBoxItemSelected]: itemProps.key === props.selectedKey,
                    })}
                >
                    {defaultRender(itemProps)}
                </span>
            );
        }
        return <></>;
    };

    return (
        <ComboBox
            allowFreeform
            caretDownButtonStyles={{ root: styles.comboBoxCaret }}
            className={props?.className}
            selectedKey={props?.selectedKey}
            disabled={props?.disabled}
            placeholder={placeholder}
            label={label}
            openOnKeyboardFocus
            multiSelect={props?.multiSelect}
            options={options}
            onChange={(_ev, option, _ind, value) => props.onChange?.(option, value)}
            onRenderItem={(props, defaultRender) => onRenderItem(props, defaultRender)}
            scrollSelectedToTop
            styles={{
                root: styles.comboBox,
                label: styles.comboBoxLabel,
                callout: styles.comboBoxCallout,
                optionsContainer: styles.optionsContainer,
            }}
            comboBoxOptionStyles={{
                rootChecked: styles.comboBoxItemChecked,
            }}
            useComboBoxAsMenuWidth
        />
    );
}
