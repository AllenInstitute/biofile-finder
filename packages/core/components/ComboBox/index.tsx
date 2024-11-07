import { ComboBox, IComboBoxOption, IRenderFunction, ISelectableOption } from "@fluentui/react";
import classNames from "classnames";
import Fuse from "fuse.js";
import * as React from "react";

import styles from "./ComboBox.module.css";

interface Props {
    className?: string;
    disabled?: boolean;
    label: string;
    multiSelect?: boolean;
    options: IComboBoxOption[];
    placeholder: string;
    threshold?: number;
    useComboBoxAsMenuWidth?: boolean;
    onChange?: (option: IComboBoxOption | undefined) => void;
}

/**
 * Custom styled wrapper for default fluentui component
 */
export default function BaseComboBox(props: Props) {
    const { options, label, placeholder } = props;

    const FUZZY_SEARCH_OPTIONS = {
        // which keys to search on
        keys: [{ name: "text", weight: 1.0 }],

        // return resulting matches sorted
        shouldSort: true,

        // arbitrarily tuned; 0.0 requires a perfect match, 1.0 would match anything
        threshold: props?.threshold || 0.3,
    };

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
            disabled={props?.disabled}
            placeholder={placeholder}
            label={label}
            multiSelect={props?.multiSelect}
            options={filteredOptions}
            onChange={(_, option) => props.onChange?.(option)}
            onInputValueChange={(value) => {
                setSearchValue(value || "");
            }}
            onRenderItem={(props, defaultRender) => onRenderItem(props, defaultRender)}
            styles={{
                root: styles.comboBox,
                label: styles.comboBoxLabel,
                callout: styles.comboBoxCallout,
            }}
            useComboBoxAsMenuWidth={props?.useComboBoxAsMenuWidth}
        />
    );
}
