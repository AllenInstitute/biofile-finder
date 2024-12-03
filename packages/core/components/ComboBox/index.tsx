import { ComboBox, IComboBoxOption, IRenderFunction, ISelectableOption } from "@fluentui/react";
import classNames from "classnames";
import Fuse from "fuse.js";
import * as React from "react";

import styles from "./ComboBox.module.css";

const FUZZY_SEARCH_OPTIONS = {
    // which keys to search on
    keys: [{ name: "text", weight: 1.0 }],

    // return resulting matches sorted
    shouldSort: true,

    // arbitrarily tuned; 0.0 requires a perfect match, 1.0 would match anything
    threshold: 0.3,
};

interface Props {
    className?: string;
    selectedKey?: string;
    disabled?: boolean;
    label: string;
    multiSelect?: boolean;
    options: IComboBoxOption[];
    placeholder: string;
    useComboBoxAsMenuWidth?: boolean;
    onChange?: (option: IComboBoxOption | undefined, value?: string | undefined) => void;
}

/**
 * Custom styled wrapper for default fluentui component
 */
export default function BaseComboBox(props: Props) {
    const { options, label, placeholder } = props;

    const [searchValue, setSearchValue] = React.useState("");

    // Fuse logic borrowed from the ListPicker component
    const fuse = React.useMemo(() => new Fuse(options, FUZZY_SEARCH_OPTIONS), [options]);
    const filteredOptions = React.useMemo(() => {
        const filteredRows = searchValue ? fuse.search(searchValue) : options;
        return filteredRows.sort((a, b) => {
            // If disabled, sort to the bottom
            return a.disabled === b.disabled ? 0 : a.disabled ? 1 : -1;
        });
    }, [options, searchValue, fuse]);

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
            options={filteredOptions}
            onChange={(_ev, option, _ind, value) => props.onChange?.(option, value)}
            onItemClick={(_, option) => props.onChange?.(option)}
            onInputValueChange={(value) => {
                setSearchValue(value || "");
            }}
            onRenderItem={(props, defaultRender) => onRenderItem(props, defaultRender)}
            styles={{
                root: styles.comboBox,
                label: styles.comboBoxLabel,
                callout: styles.comboBoxCallout,
                optionsContainer: styles.optionsContainer,
            }}
            comboBoxOptionStyles={{
                rootChecked: styles.comboBoxItemChecked,
            }}
            useComboBoxAsMenuWidth={props?.useComboBoxAsMenuWidth}
        />
    );
}
