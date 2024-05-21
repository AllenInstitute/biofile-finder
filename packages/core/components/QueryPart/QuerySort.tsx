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

    return (
        <QueryPart
            title="Sort"
            disabled={props.disabled}
            addButtonIconName="Sort"
            tutorialId={Tutorial.SORT_HEADER_ID}
            onDelete={() => dispatch(selection.actions.setSortColumn())}
            rows={
                props.sort
                    ? [
                          {
                              id: props.sort.annotationName,
                              title: `${props.sort.annotationName} (${props.sort.order})`,
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
