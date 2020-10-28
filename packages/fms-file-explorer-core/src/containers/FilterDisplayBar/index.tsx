import classNames from "classnames";
import { groupBy, map } from "lodash";
import { CommandBarButton, IContextualMenuProps } from "office-ui-fabric-react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { selection } from "../../state";
import FilterMedallion from "./FilterMedallion";

const styles = require("./FilterDisplayBar.module.css");

interface Props {
    className?: string;

    // classname to apply when this component should be hidden
    classNameHidden?: string;
}

const FILTER_BUTTON_STYLES = {
    label: {
        fontSize: "16px",
        fontWeight: "500",
    },
    root: {
        height: "35px",
        padding: 0,
        marginRight: 12,
    },
};

/**
 * Display of applied file filters.
 */
export default function FilterDisplayBar(props: Props) {
    const { className, classNameHidden } = props;

    const dispatch = useDispatch();
    const globalFilters = useSelector(selection.selectors.getFileFilters);
    const groupedByFilterName = React.useMemo(
        () => groupBy(globalFilters, (filter) => filter.name),
        [globalFilters]
    );

    const filterMenuProps: IContextualMenuProps = React.useMemo(() => {
        return {
            items: [
                {
                    key: "clearAll",
                    text: "Clear all",
                    onClick: () => {
                        dispatch(selection.actions.removeFileFilter(globalFilters));
                    },
                },
            ],
        };
    }, [dispatch, globalFilters]);

    return (
        <div
            className={classNames(styles.container, className, {
                [classNameHidden || ""]: globalFilters.length < 1,
            })}
        >
            <CommandBarButton
                className={styles.titleButton}
                menuProps={filterMenuProps}
                styles={FILTER_BUTTON_STYLES}
                text="Applied Filters"
            />
            <div className={styles.filters}>
                {map(groupedByFilterName, (filters, filterName) => (
                    <FilterMedallion key={filterName} filters={filters} name={filterName} />
                ))}
            </div>
        </div>
    );
}
