import * as React from "react";
import styles from "./EmptyFileListMessage.module.css";
import { Icon } from "@fluentui/react";
import { useSelector } from "react-redux";
import { map, isEmpty } from "lodash";
import { selection } from "../../state";
import * as annotationSelectors from "../AnnotationSidebar/selectors";
import FilterList from "./FilterList";

export default function EmptyFileListMessage() {
    const annotationHierarchyListItems = useSelector(annotationSelectors.getHierarchyListItems);
    const groupedByFilterName = useSelector(selection.selectors.getGroupedByFilterName);

    return (
        <div className={styles.emptyFileListContainer}>
            <div className={styles.emptyFileListMessage}>
                <Icon className={styles.emptySearchIcon} iconName="SearchIssue" />
                <h2>Sorry! No files found</h2>
                <div>
                    We couldn&apos;t find any files
                    {isEmpty(groupedByFilterName) && annotationHierarchyListItems.length === 0 ? (
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
                            {annotationHierarchyListItems.length > 0 && (
                                <span>
                                    {" "}
                                    with annotation
                                    {annotationHierarchyListItems.length === 1 ? "" : "s "}
                                    {map(annotationHierarchyListItems, (annotation, index) => (
                                        <span key={annotation.id} title={annotation.description}>
                                            {index > 0
                                                ? index === annotationHierarchyListItems.length - 1
                                                    ? " and "
                                                    : ", "
                                                : " "}
                                            <b>{annotation.title}</b>
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
