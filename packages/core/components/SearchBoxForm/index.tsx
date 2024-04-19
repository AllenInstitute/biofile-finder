import * as React from "react";
import { SearchBox } from "@fluentui/react";
import FileFilter from "../../entity/FileFilter";
import styles from "./SearchBoxForm.module.css";

interface SearchBoxFormProps {
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
        <div className={styles.container} data-is-focusable="true">
            <div className={styles.header}>
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
        </div>
    );
}
