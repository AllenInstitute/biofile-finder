import { IContextualMenuItem, IconButton, Spinner, SpinnerSize, TextField } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import QueryFooter from "./QueryFooter";
import QueryDataSource from "../QueryPart/QueryDataSource";
import QueryFilter from "../QueryPart/QueryFilter";
import QueryGroup from "../QueryPart/QueryGroup";
import QuerySort from "../QueryPart/QuerySort";
import Tooltip from "../Tooltip";
import { interaction, metadata, selection } from "../../state";
import { Query as QueryType } from "../../state/selection/actions";

import styles from "./Query.module.css";
import { AICS_FMS_DATA_SOURCE_NAME } from "../../constants";

interface QueryProps {
    isSelected: boolean;
    query: QueryType;
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

    const hasDataSource = !!props.query.parts.sources.length;
    const isLoading = !hasDataSource || props.query.name === AICS_FMS_DATA_SOURCE_NAME;

    const [isExpanded, setIsExpanded] = React.useState(false);
    React.useEffect(() => {
        setIsExpanded(props.isSelected);
    }, [props.isSelected]);

    const queryComponents = React.useMemo(
        () =>
            props.isSelected && !!currentQueryParts.sources.length
                ? currentQueryParts
                : props.query?.parts,
        [props.query?.parts, currentQueryParts, props.isSelected]
    );

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
            <div className={styles.container}>
                <div className={styles.loadingContainer}>
                    <Spinner size={SpinnerSize.medium} data-testid="query-spinner" />
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
                <div className={styles.header}>
                    <Tooltip content={props.query.name}>
                        <h4>{props.query.name}</h4>
                    </Tooltip>
                    <IconButton
                        ariaDescription="Expand view details"
                        ariaLabel="Expand"
                        className={styles.expandButton}
                        onClick={() => setIsExpanded(!isExpanded)}
                        iconProps={{ iconName: "ChevronDown" }}
                        data-testid="expand-button"
                    />
                </div>
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
                        <strong>Filter:</strong>{" "}
                        {queryComponents.filters
                            .map((filter) => `${filter.name}: ${filter.value}`)
                            .join(", ")}
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
                <IconButton
                    ariaDescription="Collapse view details"
                    ariaLabel="Collapse"
                    className={styles.collapseButton}
                    onClick={() => setIsExpanded(!isExpanded)}
                    iconProps={{ iconName: "ChevronUp" }}
                    data-testid="collapse-button"
                />
            </div>
            <QueryDataSource
                dataSources={queryComponents.sources}
                sourceMetadata={queryComponents.sourceMetadata}
            />
            <QueryGroup disabled={!hasDataSource} groups={queryComponents.hierarchy} />
            <QueryFilter disabled={!hasDataSource} filters={queryComponents.filters} />
            <QuerySort disabled={!hasDataSource} sort={queryComponents.sortColumn} />
            <QueryFooter
                isDeletable={queries.length > 1}
                onQueryDelete={onQueryDelete}
                query={props.query}
            />
        </div>
    );
}
