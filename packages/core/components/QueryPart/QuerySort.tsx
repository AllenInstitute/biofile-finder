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

    const pathToAnnotationMap = useSelector(metadata.selectors.getAnnotationNameToAnnotationMap);

    const onToggleSortOrder = () => {
        if (props.sort) {
            const oppositeOrder =
                props.sort.order === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC;
            const newSort = new FileSort(props.sort.path, oppositeOrder);
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
                          (() => {
                              const annotation = pathToAnnotationMap.get(props.sort.annotationName);
                              // Prefer the annotation's displayName so FMS top-level fields
                              // show "File Name" rather than the raw key "file_name".
                              const leafLabel =
                                  annotation?.displayName ??
                                  props.sort.path[props.sort.path.length - 1];
                              return {
                                  id: props.sort.annotationName,
                                  title: `${leafLabel} (${props.sort.order})`,
                                  titlePrefixParts: props.sort.path.slice(0, -1),
                                  description: annotation?.description,
                              };
                          })(),
                      ]
                    : []
            }
            onRenderAddMenuList={() => (
                <AnnotationPicker
                    disableUnavailableAnnotations
                    title="Select metadata to sort by"
                    selections={props.sort ? [props.sort.path] : []}
                    setSelections={(annotations) => {
                        const newAnnotation = annotations.find(
                            (a) => a.join(".") !== props.sort?.annotationName
                        );
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
