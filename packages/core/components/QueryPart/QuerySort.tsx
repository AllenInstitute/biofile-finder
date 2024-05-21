import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import QueryPart from ".";
import AnnotationPicker from "../AnnotationPicker";
import { metadata, selection } from "../../state";
import FileSort, { SortOrder } from "../../entity/FileSort";
import Tutorial from "../../entity/Tutorial";

interface Props {
    disabled?: boolean;
    sort?: FileSort;
}

/**
 * Component responsible for rendering the "Sort" part of the query
 */
export default function QuerySort(props: Props) {
    const dispatch = useDispatch();

    const annotations = useSelector(metadata.selectors.getSortedAnnotations);

    const onToggleSortOrder = () => {
        if (props.sort) {
            const oppositeOrder =
                props.sort.order === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC;
            const newSort = new FileSort(props.sort.annotationName, oppositeOrder);
            dispatch(selection.actions.setSortColumn(newSort));
        }
    };

    return (
        <QueryPart
            title="Sort"
            titleIconName={props.sort?.order === SortOrder.ASC ? "SortUp" : "SortDown"}
            disabled={props.disabled}
            tutorialId={Tutorial.SORT_HEADER_ID}
            onClick={onToggleSortOrder}
            onDelete={() => dispatch(selection.actions.setSortColumn())}
            rows={
                props.sort
                    ? [
                          {
                              id: props.sort.annotationName,
                              title: props.sort.annotationName,
                          },
                      ]
                    : []
            }
            onRenderAddMenuList={() => (
                <AnnotationPicker
                    disableUnavailableAnnotations
                    title="Select metadata to sort by"
                    selections={annotations.filter(
                        (annotation) => annotation.name === props.sort?.annotationName
                    )}
                    setSelections={(annotations) => {
                        const newAnnotation = annotations.filter(
                            (annotation) => annotation.name !== props.sort?.annotationName
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
    );
}
