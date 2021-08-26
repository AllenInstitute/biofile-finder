import classNames from "classnames";
import { groupBy, keyBy, map } from "lodash";
import * as React from "react";
import { useSelector } from "react-redux";
import FileFilter from "../../entity/FileFilter";

import { metadata, selection } from "../../state";
import FilterMedallion, { Filter } from "./FilterMedallion";

const styles = require("./FilterDisplayBar.module.css");

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

    const globalFilters = useSelector(selection.selectors.getAnnotationFilters);
    const annotations = useSelector(metadata.selectors.getAnnotations);
    const groupedByFilterName = React.useMemo(() => {
        const annotationNameToInstanceMap = keyBy(annotations, "name");
        const filters: Filter[] = map(globalFilters, (filter: FileFilter) => {
            const annotation = annotationNameToInstanceMap[filter.name];
            return {
                name: filter.name,
                value: filter.value,
                displayValue: annotation?.getDisplayValue(filter.value),
            };
        }).filter((filter) => filter.displayValue !== undefined);
        return groupBy(filters, (filter) => filter.name);
    }, [globalFilters, annotations]);

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
