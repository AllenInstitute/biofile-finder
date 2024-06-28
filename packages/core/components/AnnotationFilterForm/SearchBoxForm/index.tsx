import * as React from "react";

import SearchBox from "../../SearchBox";
import FileFilter from "../../../entity/FileFilter";

import styles from "./SearchBoxForm.module.css";

interface SearchBoxFormProps {
    className?: string;
    title?: string;
    onSearch: (filterValue: string) => void;
    onReset: () => void;
    fieldName: string;
    defaultValue: FileFilter | undefined;
}

/**
 * This component renders a simple form for searching on text values
 */
export default function SearchBoxForm(props: SearchBoxFormProps) {
    return (
        <div className={props.className} data-is-focusable="true">
            <h3 className={styles.title}>{props.title}</h3>
            <SearchBox
                defaultValue={props.defaultValue}
                onReset={props.onReset}
                onSearch={props.onSearch}
                placeholder={`Search by ${props.fieldName}`}
            />
        </div>
    );
}
