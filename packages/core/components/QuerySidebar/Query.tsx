import { IContextualMenuItem, SpinnerSize, TextField } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import QueryFooter from "./QueryFooter";
import { TertiaryButton, TransparentIconButton } from "../Buttons";
import LoadingIcon from "../Icons/LoadingIcon";
import QueryDataSource from "../QueryPart/QueryDataSource";
import QueryFilter from "../QueryPart/QueryFilter";
import QueryGroup from "../QueryPart/QueryGroup";
import QuerySort from "../QueryPart/QuerySort";
import Tooltip from "../Tooltip";
import { AICS_FMS_DATA_SOURCE_NAME } from "../../constants";
import { FilterType } from "../../entity/FileFilter";
import { interaction, metadata, selection } from "../../state";
import { Query as QueryType } from "../../state/selection/actions";

import styles from "./Query.module.css";

interface QueryProps {
    isSelected: boolean;
    query: QueryType;
    loading?: boolean;
}

/**
 * Component responsible for holding information about a query and providing options
 * for modifying or sharing the query
 */
export default function Query(props: QueryProps) {
    const dispatch = useDispatch();
    const queries = useSelector(selection.selectors.getQueries);
    const annotations = useSelector(metadata.selectors.getSortedAnnotations);
    const currentQueryParts = useSelector(selection.selectors.getCurrentQueryParts);

    const shouldHaveDataSource = !!window.location.search;
    const hasDataSource = !!props.query.parts.sources.length;
    const hasReloadError = useSelector(selection.selectors.getRequiresDataSourceReload);
    const isLoading =
        (shouldHaveDataSource && !hasDataSource && !hasReloadError) ||
        props.query.name === AICS_FMS_DATA_SOURCE_NAME ||
        props?.loading;
    const isLoadingNewQuery = useSelector(selection.selectors.getLoadingNewQuery);

    const [isExpanded, setIsExpanded] = React.useState(false);
    React.useEffect(() => {
        if (isLoadingNewQuery) setIsExpanded(false);
        else setIsExpanded(props.isSelected);
    }, [isLoadingNewQuery, props.isSelected]);

    const queryComponents = React.useMemo(
        () =>
            props.isSelected && !!currentQueryParts.sources.length
                ? currentQueryParts
                : props.query?.parts,
        [props.query?.parts, currentQueryParts, props.isSelected]
    );

    const condensedFilterString = React.useMemo(() => {
        return Object.entries(
            queryComponents.filters.reduce((accum, filter) => {
                let value = "";
                switch (filter.type) {
                    case FilterType.ANY:
                        value = "any value";
                        break;
                    case FilterType.EXCLUDE:
                        value = "no value";
                        break;
                    default:
                        value = ((Number(accum[filter.name]) || 0) + 1).toString();
                }
                // Special case for ranges since we don't know the exact count
                if (filter.value.toString().match(/^RANGE\((.*)\)$/)) value = "range";
                return {
                    ...accum,
                    [filter.name]: value,
                };
            }, {} as { [index: string]: string })
        )
            .map(([name, value]) => {
                if (value === "") return name;
                return `${name} (${value})`;
            })
            .join(", ");
    }, [queryComponents]);

    const onQueryUpdate = (updatedQuery: QueryType) => {
        const updatedQueries = queries.map((query) =>
            query.name === props.query.name ? updatedQuery : query
        );
        dispatch(selection.actions.changeQuery(updatedQuery));
        dispatch(selection.actions.setQueries(updatedQueries));
    };

    const onQueryDelete = () => {
        dispatch(selection.actions.removeQuery(props.query.name));
    };

    const onContextMenu = (evt: React.MouseEvent<HTMLDivElement>) => {
        evt.preventDefault();
        const items: IContextualMenuItem[] = [
            {
                key: "Delete",
                text: "Delete query",
                title: "Delete this query",
                onClick: onQueryDelete,
            },
        ];
        dispatch(interaction.actions.showContextMenu(items, evt.nativeEvent));
    };

    if (isLoading) {
        return (
            <div className={classNames(styles.container, styles.disabled)}>
                <div className={classNames(styles.header, styles.headerCollapsed)}>
                    <Tooltip content="Uploading file and creating table...">
                        <h4>
                            <i>Building new query...</i>
                        </h4>
                    </Tooltip>
                    <TransparentIconButton
                        className={styles.expandButton}
                        disabled
                        iconName="ChevronDownMed"
                    />
                </div>
                <hr className={styles.divider}></hr>
                <div className={styles.loadingContainer}>
                    <LoadingIcon
                        size={SpinnerSize.medium}
                        data-testid="query-spinner"
                        invertColor
                    />
                </div>
            </div>
        );
    }

    if (!isExpanded) {
        return (
            <div
                className={classNames(styles.container, {
                    [styles.selected]: props.isSelected,
                })}
                onClick={() =>
                    !props.isSelected && dispatch(selection.actions.changeQuery(props.query))
                }
                onContextMenu={onContextMenu}
            >
                <div className={classNames(styles.header, styles.headerCollapsed)}>
                    <Tooltip content={props.query.name}>
                        <h4>{props.query.name}</h4>
                    </Tooltip>
                    <TransparentIconButton
                        className={styles.expandButton}
                        onClick={() => setIsExpanded(!isExpanded)}
                        iconName="ChevronDownMed"
                        id="expand-button"
                    />
                </div>
                {!isExpanded && <hr className={styles.divider}></hr>}
                <p className={styles.displayRow}>
                    <strong>Data source:</strong>{" "}
                    {queryComponents.sources.map((source) => source.name).join(", ")}
                </p>
                {!!queryComponents.hierarchy.length && (
                    <p className={styles.displayRow}>
                        <strong>Group by:</strong>{" "}
                        {queryComponents.hierarchy
                            .map(
                                (a) =>
                                    annotations.find((annotation) => annotation.name === a)
                                        ?.displayName || a
                            )
                            .join(", ")}
                    </p>
                )}
                {!!queryComponents.filters.length && (
                    <p className={styles.displayRow}>
                        <strong>Filter{queryComponents.filters.length > 1 ? "s" : ""}:</strong>{" "}
                        {/* Show a condensed version of the filters list with counts instead of values */}
                        {condensedFilterString}
                    </p>
                )}
                {!!queryComponents.sortColumn && (
                    <p className={styles.displayRow}>
                        <strong>Sort:</strong> {queryComponents.sortColumn.annotationName} (
                        {queryComponents.sortColumn.order})
                    </p>
                )}
            </div>
        );
    }

    return (
        <div
            className={classNames(styles.container, { [styles.selected]: props.isSelected })}
            onContextMenu={onContextMenu}
        >
            <div className={styles.header}>
                <div className={styles.titleContainer}>
                    <TextField
                        borderless
                        defaultValue={props.query.name}
                        inputClassName={styles.title}
                        onBlur={(e) =>
                            e.currentTarget.value &&
                            onQueryUpdate({ ...props.query, name: e.currentTarget.value })
                        }
                    />
                </div>
                <TertiaryButton
                    className={styles.collapseButton}
                    onClick={() => setIsExpanded(!isExpanded)}
                    iconName="ChevronUpMed"
                    id="collapse-button"
                    title="Collapse query details"
                />
            </div>
            <QueryDataSource
                dataSources={queryComponents.sources}
                sourceMetadata={queryComponents.sourceMetadata}
                sourceProvenance={queryComponents.prov}
            />
            <QueryGroup disabled={!hasDataSource} groups={queryComponents.hierarchy} />
            <QueryFilter disabled={!hasDataSource} filters={queryComponents.filters} />
            <QuerySort disabled={!hasDataSource} sort={queryComponents.sortColumn} />
            <QueryFooter
                isDeletable={queries.length > 1}
                onQueryDelete={onQueryDelete}
                query={props.query}
                queryComponents={queryComponents}
            />
        </div>
    );
}
