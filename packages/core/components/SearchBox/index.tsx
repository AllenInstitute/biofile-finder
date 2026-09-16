import { SearchBox as SearchBoxComponent } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import { TertiaryButton } from "../Buttons";
import FileFilter from "../../entity/FileFilter";

import styles from "./SearchBox.module.css";

interface Props {
    className?: string;
    defaultValue?: FileFilter | undefined;
    id?: string;
    onChange?: (value: string) => void;
    onSearch?: (value: string) => void;
    onReset: () => void;
    placeholder?: string;
    showSubmitButton?: boolean;
    value?: string;
}

/**
 * This component renders a simple form for searching on text values
 */
export default function SearchBox(props: Props) {
    const [internalValue, setInternalValue] = React.useState(props.defaultValue?.value ?? "");
    const searchValue = props.value !== undefined ? props.value : internalValue;
    const showSubmitButton = props?.showSubmitButton || false;

    const onSearchBoxChange = (event?: React.ChangeEvent<HTMLInputElement>) => {
        if (event) {
            setInternalValue(event.target.value);
            props.onChange?.(event.target.value);
        }
    };

    function onClear() {
        props.onReset();
        setInternalValue("");
    }

    // Autofocus into search box
    const inputRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        const input = inputRef.current?.getElementsByTagName("input")[0];
        if (input) {
            // Very small timeout in case focus is captured elsewhere by click event
            setTimeout(() => {
                input.focus();
            }, 100); // 10 is too small, anything higher is slightly visible
        }
    }, [inputRef]);

    return (
        <div className={styles.searchBoxWrapper}>
            <SearchBoxComponent
                className={classNames(props.className, styles.searchBox)}
                id={`${props.id}-searchbox`}
                onClear={onClear}
                onSearch={props.onSearch}
                onChange={onSearchBoxChange}
                placeholder={props.placeholder || "Search..."}
                ref={inputRef}
                value={searchValue}
            />
            {showSubmitButton && (
                <TertiaryButton
                    className={styles.submitButton}
                    title={"Submit"}
                    onClick={() => props.onSearch?.(searchValue)}
                    iconName="ReturnKey"
                />
            )}
        </div>
    );
}
