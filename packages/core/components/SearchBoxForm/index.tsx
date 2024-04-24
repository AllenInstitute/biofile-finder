import { SearchBox } from "@fluentui/react";
import * as React from "react";

import FileFilter from "../../entity/FileFilter";

import styles from "./SearchBoxForm.module.css";

interface SearchBoxFormProps {
    className?: string;
    title?: string;
    onSearch: (filterValue: string) => void;
    onReset: () => void;
    fieldName: string;
    currentValue: FileFilter | undefined;
}

const SEARCH_BOX_STYLE_OVERRIDES = {
    icon: {
        color: "steelblue",
    },
};

/**
 * This component renders a simple form for searching on text values
 */
export default function SearchBoxForm(props: SearchBoxFormProps) {
    const { onSearch, onReset, fieldName, currentValue } = props;

    const [searchValue, setSearchValue] = React.useState(currentValue?.value ?? "");

    const onSearchBoxChange = (event?: React.ChangeEvent<HTMLInputElement>) => {
        if (event) {
            setSearchValue(event.target.value);
        }
    };

    function onClear() {
        onReset();
        setSearchValue("");
    }

    return (
        <div className={props.className} data-is-focusable="true">
            <h3 className={styles.title}>{props.title}</h3>
            <SearchBox
                onClear={onClear}
                className={styles.searchBoxInput}
                placeholder={`Search by ${fieldName}`}
                styles={SEARCH_BOX_STYLE_OVERRIDES}
                onSearch={onSearch}
                onChange={onSearchBoxChange}
                value={searchValue}
            />
        </div>
    );
}
