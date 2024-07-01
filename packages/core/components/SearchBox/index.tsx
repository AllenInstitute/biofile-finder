import { SearchBox as SearchBoxComponent } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

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
}

/**
 * This component renders a simple form for searching on text values
 */
export default function SearchBox(props: Props) {
    const [searchValue, setSearchValue] = React.useState(props.defaultValue?.value ?? "");

    const onSearchBoxChange = (event?: React.ChangeEvent<HTMLInputElement>) => {
        if (event) {
            setSearchValue(event.target.value);
            props.onChange?.(event.target.value);
        }
    };

    function onClear() {
        props.onReset();
        setSearchValue("");
    }

    return (
        <SearchBoxComponent
            className={classNames(props.className, styles.searchBox)}
            id={props.id}
            onClear={onClear}
            onSearch={props.onSearch}
            onChange={onSearchBoxChange}
            placeholder={props.placeholder || "Search..."}
            value={searchValue}
        />
    );
}
