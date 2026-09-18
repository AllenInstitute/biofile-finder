import { ComboBox, IComboBoxOption, IRenderFunction, ISelectableOption } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import Tooltip from "../Tooltip";

import styles from "./ComboBox.module.css";

// Roughly how many options fit within the callout's max height without scrolling.
const MAX_OPTIONS_WITHOUT_SCROLL = 7;

interface Props {
    className?: string;
    rootClassName?: string;
    selectedKey?: string | null;
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
    const isShortList = options.length <= MAX_OPTIONS_WITHOUT_SCROLL;

    const onRenderItem = (
        itemProps: ISelectableOption | undefined,
        defaultRender: IRenderFunction<ISelectableOption> | undefined
    ): JSX.Element => {
        if (itemProps && defaultRender) {
            return (
                <Tooltip
                    content={itemProps.data?.tooltip}
                    key={`${itemProps.key}-${itemProps.index}`}
                >
                    <span
                        className={classNames(styles.comboBoxItem, {
                            [styles.comboBoxItemDisabled]: !!itemProps.disabled,
                            [styles.comboBoxItemSelected]: itemProps.key === props.selectedKey,
                        })}
                    >
                        {defaultRender(itemProps)}
                    </span>
                </Tooltip>
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
                root: classNames(styles.comboBox, props.rootClassName),
                label: styles.comboBoxLabel,
                callout: classNames(styles.comboBoxCallout, {
                    [styles.comboBoxCalloutShort]: isShortList,
                }),
                optionsContainer: classNames(styles.optionsContainer, {
                    [styles.optionsContainerShort]: isShortList,
                }),
            }}
            comboBoxOptionStyles={{
                rootChecked: styles.comboBoxItemChecked,
            }}
            useComboBoxAsMenuWidth
        />
    );
}
