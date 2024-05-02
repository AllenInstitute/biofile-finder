import { IconButton, TextField } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import QueryFooter from "./QueryFooter";
import QueryDataSource from "../QueryPart/QueryDataSource";
import QueryFilter from "../QueryPart/QueryFilter";
import QueryGroup from "../QueryPart/QueryGroup";
import QuerySort from "../QueryPart/QuerySort";
import FileExplorerURL from "../../entity/FileExplorerURL";
import { selection } from "../../state";
import { Query as QueryType } from "../../state/selection/actions";

import styles from "./Query.module.css";

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
    const annotations = useSelector(selection.selectors.getSortedAnnotations);
    const currentGlobalURL = useSelector(selection.selectors.getEncodedFileExplorerUrl);

    const [isExpanded, setIsExpanded] = React.useState(false);
    React.useEffect(() => {
        setIsExpanded(props.isSelected);
    }, [props.isSelected]);

    const decodedURL = React.useMemo(
        () =>
            props.isSelected
                ? FileExplorerURL.decode(currentGlobalURL)
                : FileExplorerURL.decode(props.query.url),
        [props.query.url, currentGlobalURL, props.isSelected]
    );

    const onQueryUpdate = (updatedQuery: QueryType) => {
        const updatedQueries = queries.map((query) =>
            query.name === props.query.name ? updatedQuery : query
        );
        dispatch(selection.actions.changeQuery(updatedQuery));
        dispatch(selection.actions.setQueries(updatedQueries));
    };

    const onQueryDelete = () => {
        const filteredQueries = queries.filter((query) => query.name !== props.query.name);
        dispatch(selection.actions.changeQuery(filteredQueries[0]));
        dispatch(selection.actions.setQueries(filteredQueries));
    };

    const dataSourceName = decodedURL.collection?.name || "AICS FMS";
    if (!isExpanded) {
        return (
            <div>
                <hr className={styles.divider} />
                <div
                    className={classNames(styles.container, {
                        [styles.selected]: props.isSelected,
                    })}
                    onClick={() =>
                        !props.isSelected && dispatch(selection.actions.changeQuery(props.query))
                    }
                >
                    <div className={styles.header}>
                        <h4>{props.query.name}</h4>
                        {props.isSelected && (
                            <IconButton
                                ariaDescription="Expand view details"
                                ariaLabel="Expand"
                                className={styles.collapseButton}
                                onClick={() => setIsExpanded(!isExpanded)}
                                iconProps={{ iconName: "ChevronUp" }}
                            />
                        )}
                    </div>
                    {props.isSelected && <hr />}
                    <p className={styles.displayRow}>
                        <strong>Data Source:</strong> {dataSourceName}
                    </p>
                    {!!decodedURL.hierarchy.length && (
                        <p className={styles.displayRow}>
                            <strong>Groupings:</strong>{" "}
                            {decodedURL.hierarchy
                                .map(
                                    (a) =>
                                        annotations.find((annotation) => annotation.name === a)
                                            ?.displayName || a
                                )
                                .join(", ")}
                        </p>
                    )}
                    {!!decodedURL.filters.length && (
                        <p className={styles.displayRow}>
                            <strong>Filters:</strong>{" "}
                            {decodedURL.filters
                                .map((filter) => `${filter.name}: ${filter.value}`)
                                .join(", ")}
                        </p>
                    )}
                    {!!decodedURL.sortColumn && (
                        <p className={styles.displayRow}>
                            <strong>Sort:</strong> {decodedURL.sortColumn.annotationName} (
                            {decodedURL.sortColumn.order})
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div>
            <hr className={styles.divider} />
            <div className={classNames(styles.container, { [styles.selected]: props.isSelected })}>
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
                        ariaDescription="Expand view details"
                        ariaLabel="Expand"
                        className={styles.collapseButton}
                        onClick={() => setIsExpanded(!isExpanded)}
                        iconProps={{ iconName: "ChevronDown" }}
                    />
                </div>
                <hr className={styles.divider} />
                <QueryDataSource dataSources={[decodedURL.collection]} />
                <QueryGroup groups={decodedURL.hierarchy} />
                <QueryFilter filters={decodedURL.filters} />
                <QuerySort sort={decodedURL.sortColumn} />
                <hr className={styles.divider} />
                <QueryFooter
                    isDeletable={queries.length > 1}
                    onQueryDelete={onQueryDelete}
                    query={props.query}
                />
            </div>
        </div>
    );
}
