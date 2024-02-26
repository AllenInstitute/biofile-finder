import classNames from "classnames";
import { map } from "lodash";
import * as React from "react";
import styles from "./FilterList.module.css";
import { Filter } from "../../entity/FileFilter";

interface Props {
    name: string;
    filters: Filter[];
}

/**
 * UI for displaying the annotation values applied as file filters. Each `FileFilter` within `props.filters`
 * must relate to the same annotation (e.g. Each `FileFilter::name` should be equal).
 * Logic is based on the FilterMedallion component
 */
export default function FilterList(props: Props) {
    const { filters, name } = props;

    const [expanded, setExpanded] = React.useState(false);

    // Determine if filter has reached its max-width and text is overflowing
    // If a filter is no longer overflowing but its "expanded" state is truthy, reset.
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

    const operator = filters.length > 1 ? "for values of" : "equal to";
    const valueDisplay = map(filters, (filter) => filter.displayValue).join(", ");
    const display = ` ${operator} ${valueDisplay}`;

    return (
        <span className={styles.filter}>
            <span
                className={classNames(styles.filterText, {
                    [styles.expandable]: overflowing,
                    [styles.expanded]: expanded,
                })}
                onClick={() => overflowing && setExpanded((prev) => !prev)}
                ref={textRef}
                title={name + display}
            >
                <b>{name}</b> {display}
            </span>
        </span>
    );
}
