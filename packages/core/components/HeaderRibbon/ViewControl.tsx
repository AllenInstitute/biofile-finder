import { IContextualMenuItemProps, IStyle } from "@fluentui/react";
import * as React from "react";
import { useDispatch } from "react-redux";
import { RELATIVE_DATE_RANGES } from "../../constants";

import { selection } from "../../state";
import SearchableDropdown from "../SearchableDropdown";

import styles from "./HeaderRibbon.module.css";

interface Props {
    className?: string;
    isCollapsed?: boolean;
}

const MENU_STYLES: IStyle = {
    // Color is lightened tint of --primary-brand-dark-blue defined in App.module.css
    backgroundColor: "#1A4A71",
    color: "white",
    ":hover": {
        // Equivalent to --primary-brand-dark-blue defined in App.module.css
        backgroundColor: "#003057",
        color: "white",
    },
    ":active": {
        // Equivalent to --primary-brand-dark-blue defined in App.module.css
        backgroundColor: "#003057",
        color: "white",
    },
};

const OPTION_PROPS: Partial<IContextualMenuItemProps> = {
    styles: {
        label: {
            color: "white",
        },
        item: MENU_STYLES,
        root: MENU_STYLES,
    },
};

/**
 * Form group for controlling the explorer view which can be a collection
 * of various filters and sorts.
 */
export default function ViewControl(props: Props) {
    const dispatch = useDispatch();

    const [searchValue, setSearchValue] = React.useState("");

    const viewOptions = React.useMemo(
        () =>
            RELATIVE_DATE_RANGES.filter((relativeDateRange) =>
                relativeDateRange.name.toLowerCase().includes(searchValue)
            ).map((relativeDateRange) => ({
                key: relativeDateRange.name,
                text: relativeDateRange.name,
                title: relativeDateRange.description,
                onClick: () => {
                    setSearchValue("");
                    dispatch(selection.actions.changeView(relativeDateRange.name));
                },
                itemProps: OPTION_PROPS,
            })),
        [searchValue, setSearchValue, dispatch]
    );

    return (
        <div className={props.className}>
            <div className={styles.controlGroupInputGroup}>
                <SearchableDropdown
                    className={styles.controlGroupDropdown}
                    isHidden={props.isCollapsed}
                    options={viewOptions}
                    onSearch={setSearchValue}
                    searchValue={searchValue}
                />
            </div>
        </div>
    );
}
