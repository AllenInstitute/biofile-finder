import { map } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import QueryPart from ".";
import AnnotationPicker from "../AnnotationPicker";
import AnnotationFilterForm from "../AnnotationFilterForm";
import Tutorial from "../../entity/Tutorial";
import FileFilter from "../../entity/FileFilter";
import { metadata, selection } from "../../state";
import Annotation from "../../entity/Annotation";

interface Props {
    filters: FileFilter[];
}

/**
 * Component responsible for rendering the "Filter" part of the query
 */
export default function QueryFilter(props: Props) {
    const dispatch = useDispatch();

    const annotations = useSelector(metadata.selectors.getSortedAnnotations);
    const filtersGroupedByName = useSelector(selection.selectors.getGroupedByFilterName);

    return (
        <QueryPart
            title="Filter"
            addButtonIconName="Filter"
            tutorialId={Tutorial.FILTER_HEADER_ID}
            onDelete={(annotation) =>
                dispatch(
                    selection.actions.removeFileFilter(
                        props.filters.filter((filter) => filter.name === annotation)
                    )
                )
            }
            onRenderAddMenuList={() => (
                <AnnotationPicker
                    disableUnavailableAnnotations
                    annotationSubMenuRenderer={(annotationItem) => (
                        <AnnotationFilterForm annotation={annotationItem.data as Annotation} />
                    )}
                    selections={annotations.filter((annotation) =>
                        props.filters.some((f) => f.name === annotation.name)
                    )}
                    setSelections={() => dispatch(selection.actions.setFileFilters([]))}
                />
            )}
            onRenderEditMenuList={(item) => {
                const annotation = annotations.find((a) => a.name === item.id);
                return <AnnotationFilterForm annotation={annotation as Annotation} />;
            }}
            rows={Object.entries(filtersGroupedByName).map(([annotationName, filters]) => {
                const operator = filters.length > 1 ? "ONE OF" : "EQUALS";
                const valueDisplay = map(filters, (filter) => filter.displayValue).join(", ");
                return {
                    id: filters[0].name,
                    title: `${annotationName} ${operator} ${valueDisplay}`,
                };
            })}
        />
    );
}
