import classNames from "classnames";
import { ContextualMenu, IContextualMenuItem } from "@fluentui/react";
import * as React from "react";

import styles from "./SearchableDropdown.module.css";

interface Props {
    className?: string;
    isHidden?: boolean;
    options: IContextualMenuItem[];
    selectedOption?: string;
    onSearch: (value: string) => void;
    searchValue: string;
}

/**
 * Generic component responsible for rendering a dropdown whose options are searchable
 */
export default function SearchableDropdown(props: Props) {
    const searchBoxReference = React.useRef(null);
    const [showDropdown, setShowDropdown] = React.useState(false);

    function onMenuDismiss() {
        props.onSearch("");
        setShowDropdown(false);
    }

    // Derive empty state whenever props signal state as hidden
    const { isHidden, onSearch } = props;
    React.useEffect(() => {
        if (isHidden) {
            onSearch("");
            setShowDropdown(false);
        }
    }, [isHidden, onSearch, setShowDropdown]);

    return (
        <>
            <input
                required
                className={classNames(styles.dropdown, props.className)}
                spellCheck={false}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    props.onSearch(event.target.value.toLowerCase());
                }}
                ref={searchBoxReference}
                placeholder="Search..."
                onClick={() => setShowDropdown(true)}
                value={showDropdown ? props.searchValue : props.selectedOption}
                type="search"
            />
            <ContextualMenu
                items={props.options}
                hidden={!showDropdown}
                target={searchBoxReference.current}
                onDismiss={onMenuDismiss}
                onItemClick={onMenuDismiss}
                // Auto adjusts width minimum to input width
                useTargetAsMinWidth
                // Required to have width auto-adjust
                shouldUpdateWhenHidden
            />
        </>
    );
}
