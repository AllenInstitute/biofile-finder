import classNames from "classnames";
import { groupBy, map } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import Tippy from "@tippy.js/react";
import "tippy.js/dist/tippy.css"; // side-effect

import { REMOVE_ICON_PATH_DATA } from "../../icons";
import { selection } from "../../state";
import FileFilter from "../../entity/FileFilter";
import SvgIcon from "../../components/SvgIcon";

const styles = require("./FilterDisplayBar.module.css");

interface FilterMedallionProps {
    name: string;
    filters: FileFilter[];
}

function FilterMedallion(props: FilterMedallionProps) {
    const { filters, name } = props;
    const [expand, setExpand] = React.useState(false);
    const dispatch = useDispatch();

    const operator = filters.length > 1 ? "ONE OF" : "EQUALS";
    const valueDisplay = map(filters, (filter) => filter.value).join(", ");
    const display = `${name} ${operator} ${valueDisplay}`;
    return (
        <div className={styles.medallion}>
            <Tippy content={display}>
                <div
                    className={classNames(styles.medallionText, { [styles.expanded]: expand })}
                    onClick={() => setExpand((prev) => !prev)}
                >
                    {display}
                </div>
            </Tippy>
            <span className={styles.spacer}></span>
            <SvgIcon
                className={styles.closeIcon}
                height={15}
                onClick={() => {
                    dispatch(selection.actions.removeFileFilter(filters));
                }}
                pathData={REMOVE_ICON_PATH_DATA}
                viewBox="0 0 20 20"
                width={15}
            />
        </div>
    );
}

interface FilterDisplayBarProps {
    className?: string;
}

export default function FilterDisplayBar(props: FilterDisplayBarProps) {
    const { className } = props;

    const globalFilters = useSelector(selection.selectors.getFileFilters);
    const groupedByFilter = React.useMemo(() => groupBy(globalFilters, (filter) => filter.name), [
        globalFilters,
    ]);

    return (
        <div className={classNames(styles.container, className)}>
            {map(groupedByFilter, (filters, filterName) => (
                <FilterMedallion key={filterName} filters={filters} name={filterName} />
            ))}
        </div>
    );
}
