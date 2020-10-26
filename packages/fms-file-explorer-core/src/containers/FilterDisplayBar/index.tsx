import classNames from "classnames";
import { groupBy, map } from "lodash";
import * as React from "react";
import { useSelector } from "react-redux";

import { selection } from "../../state";
import FilterMedallion from "./FilterMedallion";

const styles = require("./FilterDisplayBar.module.css");

interface Props {
    className?: string;
}

/**
 * Display of applied file filters.
 */
export default function FilterDisplayBar(props: Props) {
    const { className } = props;

    const globalFilters = useSelector(selection.selectors.getFileFilters);
    const groupedByFilterName = React.useMemo(
        () => groupBy(globalFilters, (filter) => filter.name),
        [globalFilters]
    );

    return (
        <div className={classNames(styles.container, className)}>
            {map(groupedByFilterName, (filters, filterName) => (
                <FilterMedallion key={filterName} filters={filters} name={filterName} />
            ))}
        </div>
    );
}
