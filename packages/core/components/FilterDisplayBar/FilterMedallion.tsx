import classNames from "classnames";
import { map } from "lodash";
import { IconButton } from "@fluentui/react";
import * as React from "react";
import { useDispatch } from "react-redux";

import { selection } from "../../state";
import FileFilter from "../../entity/FileFilter";
import AnnotationFilter from "../AnnotationSidebar/AnnotationFilter";

import styles from "./FilterMedallion.module.css";

export interface Filter {
    name: string;
    value: any;
    displayValue: string;
}

interface Props {
    name: string;
    filters: Filter[];
}

const CLOSE_ICON = { iconName: "ChromeClose" };
const BUTTON_STYLES = {
    icon: {
        color: "black",
        fontSize: "8px",
    },
    menuIcon: {
        display: "none",
    },
    root: {
        height: 22,
        width: 22,
        padding: 0,
    },
};

/**
 * UI for displaying the annotation values applied as file filters. Each `FileFilter` within `props.filters`
 * must relate to the same annotation (e.g. Each `FileFilter::name` should be equal).
 */
export default function FilterMedallion(props: Props) {
    const { filters, name } = props;
    const dispatch = useDispatch();

    const [expanded, setExpanded] = React.useState(false);

    // This should never change, so stash in a ref to keep the reference stable and not cause
    // AnnotationFilter to rerender all the time
    const annotationFilterIconStyles = React.useRef({ root: BUTTON_STYLES.root });

    // Determine if medallion has reached its max-width and text is overflowing
    // If a medallion is no longer overflowing but its "expanded" state is truthy, reset.
    const [overflowing, setOverflowing] = React.useState(false);
    const textRef = React.useRef<HTMLElement | null>(null);
    React.useEffect(() => {
        if (textRef.current) {
            const width = textRef.current.clientWidth;
            const scrollWidth = textRef.current.scrollWidth;
            const isOverflowing = scrollWidth > width;
            setOverflowing(isOverflowing);
            if (!isOverflowing) {
                setExpanded(false);
            }
        } else {
            setOverflowing(false);
        }
    }, [textRef, filters]);

    const operator = filters.length > 1 ? "ONE OF" : "EQUALS";
    const valueDisplay = map(filters, (filter) => filter.displayValue).join(", ");
    const display = `${name} ${operator} ${valueDisplay}`;

    return (
        <div className={styles.medallion}>
            <abbr
                className={classNames(styles.medallionText, {
                    [styles.expandable]: overflowing,
                    [styles.expanded]: expanded,
                })}
                onClick={() => overflowing && setExpanded((prev) => !prev)}
                ref={textRef}
                title={display}
            >
                {display}
            </abbr>
            <span className={styles.spacer}></span>
            <AnnotationFilter
                annotationName={name}
                styleOverrides={annotationFilterIconStyles.current}
            />
            <IconButton
                ariaDescription={`Clear all filters currently set for ${name}`}
                ariaLabel="Clear"
                iconProps={CLOSE_ICON}
                onClick={() => {
                    const fileFilters = filters.map(
                        (filter) => new FileFilter(filter.name, filter.value)
                    );
                    dispatch(selection.actions.removeFileFilter(fileFilters));
                }}
                styles={BUTTON_STYLES}
            />
        </div>
    );
}
