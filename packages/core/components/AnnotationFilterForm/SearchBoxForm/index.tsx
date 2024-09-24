import classNames from "classnames";
import * as React from "react";

import { ListItem } from "../../ListPicker/ListRow";
import SearchBox from "../../SearchBox";
import FileFilter from "../../../entity/FileFilter";

import styles from "./SearchBoxForm.module.css";

interface SearchBoxFormProps {
    className?: string;
    items?: ListItem[];
    title?: string;
    onDeselect?: (item: ListItem) => void;
    onDeselectAll: () => void;
    onSelect?: (item: ListItem) => void;
    onSelectAll: () => void;
    onSearch: (filterValue: string) => void;
    fieldName: string;
    defaultValue: FileFilter | undefined;
}

/**
 * This component renders a simple form for searching on text values
 */
export default function SearchBoxForm(props: SearchBoxFormProps) {
    return (
        <div className={classNames(props.className, styles.container)}>
            <h3 className={styles.title}>{props.title}</h3>
            <SearchBox
                defaultValue={props.defaultValue}
                onReset={props.onDeselectAll}
                onSearch={props.onSearch}
                placeholder={"Search..."}
                showSubmitButton={true}
            />
        </div>
    );
}
