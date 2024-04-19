import { Icon } from "@fluentui/react";
import { map, isEmpty } from "lodash";
import * as React from "react";
import { useSelector } from "react-redux";

import FilterList from "./FilterList";
import { selection } from "../../state";

import styles from "./EmptyFileListMessage.module.css";

export default function EmptyFileListMessage() {
    const annotationHierarchy = useSelector(selection.selectors.getAnnotationHierarchy);
    const groupedByFilterName = useSelector(selection.selectors.getGroupedByFilterName);

    return (
        <div className={styles.emptyFileListContainer}>
            <div className={styles.emptyFileListMessage}>
                <Icon className={styles.emptySearchIcon} iconName="SearchIssue" />
                <h2>Sorry! No files found</h2>
                <div>
                    We couldn&apos;t find any files
                    {isEmpty(groupedByFilterName) && annotationHierarchy.length === 0 ? (
                        <>&nbsp;matching your request.</>
                    ) : (
                        <span>
                            {!isEmpty(groupedByFilterName) && (
                                <span>
                                    {" "}
                                    matching
                                    {map(groupedByFilterName, (filters, filterName) => (
                                        <FilterList
                                            key={filterName}
                                            filters={filters}
                                            name={filterName}
                                        />
                                    ))}
                                </span>
                            )}
                            {annotationHierarchy.length > 0 && (
                                <span>
                                    {" "}
                                    with annotation
                                    {annotationHierarchy.length === 1 ? "" : "s "}
                                    {map(annotationHierarchy, (annotation, index) => (
                                        <span key={annotation.name} title={annotation.description}>
                                            {index > 0
                                                ? index === annotationHierarchy.length - 1
                                                    ? " and "
                                                    : ", "
                                                : " "}
                                            <b>{annotation.displayName}</b>
                                        </span>
                                    ))}
                                </span>
                            )}{" "}
                        </span>
                    )}
                </div>
                <br />
                <div>
                    Double check your filters for any issues and then contact the software team if
                    you still expect there to be matches present.
                </div>
            </div>
        </div>
    );
}
