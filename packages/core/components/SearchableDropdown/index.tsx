import classNames from "classnames";
import { ContextualMenu, IContextualMenuItem } from "office-ui-fabric-react";
import * as React from "react";

const styles = require("./SearchableDropdown.module.css");

interface Props {
    className?: string;
    options: IContextualMenuItem[];
    selectedOption?: string;
    onSearch: (value: string) => void;
    searchValue: string;
}

/**
 * TODO
 */
export default function SearchableDropdown(props: Props) {
    const searchBoxReference = React.useRef(null);
    const [showDropdown, setShowDropdown] = React.useState(false);

    function onMenuDismiss() {
        props.onSearch("");
        setShowDropdown(false);
    }

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
            />
        </>
    );
}
