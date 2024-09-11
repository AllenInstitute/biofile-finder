import { Toggle } from "@fluentui/react";
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
    onToggleFuzzySearch: () => void;
    fuzzySearchEnabled?: boolean;
    defaultValue: FileFilter | undefined;
}

/**
 * This component renders a simple form for searching on text values
 * with a toggle for exact vs fuzzy (non-exact) search matching
 */
export default function SearchBoxForm(props: SearchBoxFormProps) {
    const [isFuzzySearching, setIsFuzzySearching] = React.useState(
        props?.fuzzySearchEnabled || false
    );

    function onSearchSubmitted(value: string) {
        // Make sure fuzzy search is synchronized in state
        if (isFuzzySearching !== props?.fuzzySearchEnabled) {
            props.onToggleFuzzySearch();
        }
        props.onSearch(value);
    }

    const _onToggleFuzzySearch = (_: React.MouseEvent<HTMLElement>, checked?: boolean): void => {
        setIsFuzzySearching(!!checked);
        // Trigger search without requiring user to hit enter/submit
        if (props?.defaultValue) props.onToggleFuzzySearch();
    };

    return (
        <div className={classNames(props.className, styles.container)}>
            <h3 className={styles.title}>{props.title}</h3>
            <Toggle
                label="Fuzzy search"
                className={styles.toggle}
                defaultChecked={isFuzzySearching}
                onText="On"
                inlineLabel
                offText="Off"
                onChange={_onToggleFuzzySearch}
                title={`Turn ${isFuzzySearching ? "off" : "on"} fuzzy search (non-exact searching)`}
                styles={{
                    label: styles.toggleLabel,
                    pill: isFuzzySearching ? styles.togglePillOn : styles.togglePillOff,
                }}
            />
            <SearchBox
                defaultValue={props.defaultValue}
                onReset={props.onDeselectAll}
                onSearch={onSearchSubmitted}
                placeholder={"Search..."}
                showSubmitButton={true}
            />
        </div>
    );
}
