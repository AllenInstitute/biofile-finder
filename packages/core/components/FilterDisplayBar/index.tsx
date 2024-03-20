import classNames from "classnames";
import { map } from "lodash";
import * as React from "react";
import { useSelector } from "react-redux";

import { selection } from "../../state";
import FilterMedallion from "./FilterMedallion";

import styles from "./FilterDisplayBar.module.css";

interface Props {
    className?: string;

    // classname to apply when this component should be hidden
    classNameHidden?: string;
}

/**
 * Display of applied file filters.
 */
export default function FilterDisplayBar(props: Props) {
    const { className, classNameHidden } = props;

    const globalFilters = useSelector(selection.selectors.getFileFilters);
    const groupedByFilterName = useSelector(selection.selectors.getGroupedByFilterName);

    return (
        <div
            className={classNames(styles.container, className, {
                [classNameHidden || ""]: globalFilters.length < 1,
            })}
        >
            <h6 className={styles.title}>Applied Filters</h6>
            <div className={styles.filters}>
                {map(groupedByFilterName, (filters, filterName) => (
                    <FilterMedallion key={filterName} filters={filters} name={filterName} />
                ))}
            </div>
        </div>
    );
}
