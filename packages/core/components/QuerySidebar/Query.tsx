import { Icon, IconButton, TextField } from "@fluentui/react";
import classNames from "classnames";
import { map } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import QueryPart from "./QueryPart";
import AnnotationPicker from "../AnnotationPicker";
import QueryFooter from "./QueryFooter";
import Tutorial from "../../entity/Tutorial";
import FileExplorerURL from "../../entity/FileExplorerURL";
import FileSort, { SortOrder } from "../../entity/FileSort";
import { metadata, selection } from "../../state";
import { Query as QueryType } from "../../state/selection/actions";

import styles from "./Query.module.css";
import AnnotationFilterForm from "../AnnotationFilterForm";
import { QueryPartRowItem } from "./QueryPartRow";

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
    const currentGlobalURL = useSelector(selection.selectors.getEncodedFileExplorerUrl);
    const filtersGroupedByName = useSelector(selection.selectors.getGroupedByFilterName);

    const [isExpanded, setIsExpanded] = React.useState(false);
    React.useEffect(() => {
        setIsExpanded(props.isSelected);
    }, [props.isSelected]);

    const decodedURL = React.useMemo(
        () =>
            props.isSelected
                ? FileExplorerURL.decode(currentGlobalURL, annotations)
                : FileExplorerURL.decode(props.query.url, annotations),
        [props.query.url, currentGlobalURL, annotations, props.isSelected]
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
                                .map((annotation) => annotation.displayName)
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
                <div className={styles.dataSourceContainer}>
                    <div className={styles.dataSourceHeader}>
                        <Icon iconName="Folder" />
                        <h5>Data Source</h5>
                    </div>
                    <p>{dataSourceName}</p>
                </div>
                <hr className={styles.smallDivider} />
                <QueryPart
                    title="Group"
                    addButtonIconName="FabricFolder"
                    tutorialId={Tutorial.GROUPING_HEADER_ID}
                    onDelete={(annotation) =>
                        dispatch(selection.actions.removeFromAnnotationHierarchy(annotation))
                    }
                    onReorder={(annotation, destinationIndex) =>
                        dispatch(
                            selection.actions.reorderAnnotationHierarchy(
                                annotation,
                                destinationIndex
                            )
                        )
                    }
                    onRenderAddMenuList={() => (
                        <AnnotationPicker
                            disableUnavailableAnnotations
                            selections={decodedURL.hierarchy}
                            setSelections={(annotations) => {
                                dispatch(selection.actions.setAnnotationHierarchy(annotations));
                            }}
                        />
                    )}
                    rows={decodedURL.hierarchy.map((annotation) => ({
                        id: annotation.name,
                        title: annotation.displayName,
                    }))}
                />
                <hr className={styles.smallDivider} />
                <QueryPart
                    title="Filter"
                    addButtonIconName="Filter"
                    tutorialId={Tutorial.FILTER_HEADER_ID}
                    onDelete={(annotation) =>
                        dispatch(
                            selection.actions.removeFileFilter(
                                decodedURL.filters.filter((filter) => filter.name === annotation)
                            )
                        )
                    }
                    onRenderAddMenuList={() => (
                        <AnnotationPicker
                            disableUnavailableAnnotations
                            annotationSubMenuRenderer={(annotationItem) => (
                                <AnnotationFilterForm name={annotationItem.data?.name as string} />
                            )}
                            selections={annotations.filter((annotation) =>
                                decodedURL.filters.some((f) => f.name === annotation.name)
                            )}
                            setSelections={() => selection.actions.setFileFilters([])}
                        />
                    )}
                    onRenderEditMenuList={(item: QueryPartRowItem) => (
                        <AnnotationFilterForm name={item.id} />
                    )}
                    rows={Object.entries(filtersGroupedByName).map(([annotation, filters]) => {
                        const operator = filters.length > 1 ? "ONE OF" : "EQUALS";
                        const valueDisplay = map(filters, (filter) => filter.displayValue).join(
                            ", "
                        );
                        return {
                            id: annotation,
                            title: `${annotation} ${operator} ${valueDisplay}`,
                        };
                    })}
                />
                <hr className={styles.smallDivider} />
                <QueryPart
                    title="Sort"
                    addButtonIconName="Sort"
                    tutorialId={Tutorial.SORT_HEADER_ID}
                    onDelete={() => dispatch(selection.actions.setSortColumn())}
                    rows={
                        decodedURL.sortColumn
                            ? [
                                  {
                                      id: decodedURL.sortColumn.annotationName,
                                      title: `${decodedURL.sortColumn.annotationName} (${decodedURL.sortColumn.order})`,
                                  },
                              ]
                            : []
                    }
                    onRenderAddMenuList={() => (
                        <AnnotationPicker
                            disableUnavailableAnnotations
                            selections={annotations.filter(
                                (annotation) =>
                                    annotation.name === decodedURL.sortColumn?.annotationName
                            )}
                            setSelections={(annotations) => {
                                const newAnnotation = annotations.filter(
                                    (annotation) =>
                                        annotation.name !== decodedURL.sortColumn?.annotationName
                                )?.[0].name;
                                dispatch(
                                    selection.actions.setSortColumn(
                                        newAnnotation
                                            ? new FileSort(newAnnotation, SortOrder.DESC)
                                            : undefined
                                    )
                                );
                            }}
                        />
                    )}
                />
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
