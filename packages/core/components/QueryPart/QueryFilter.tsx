import { map } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import QueryPart from ".";
import AnnotationPicker from "../AnnotationPicker";
import AnnotationFilterForm from "../AnnotationFilterForm";
import Annotation from "../../entity/Annotation";
import FileFilter, { FilterType } from "../../entity/FileFilter";
import Tutorial from "../../entity/Tutorial";
import { metadata, selection } from "../../state";

interface Props {
    disabled?: boolean;
    filters: FileFilter[];
}

/**
 * Component responsible for rendering the "Filter" part of the query
 */
export default function QueryFilter(props: Props) {
    const dispatch = useDispatch();

    const filtersGroupedByName = useSelector(selection.selectors.getGroupedByFilterName);
    const pathToAnnotationMap = useSelector(
        metadata.selectors.getAnnotationNameToAnnotationMap
    );

    return (
        <QueryPart
            title="Filter"
            disabled={props.disabled}
            tutorialId={Tutorial.FILTER_HEADER_ID}
            onDelete={(annotation) => {
                dispatch(
                    selection.actions.removeFileFilter(
                        props.filters.filter((filter) => filter.name === annotation)
                    )
                );
            }}
            onRenderAddMenuList={() => (
                <AnnotationPicker
                    id={Tutorial.FILE_ATTRIBUTE_FILTER_ID}
                    title="Select metadata to filter by"
                    annotationSubMenuRenderer={(annotationItem) => (
                        <AnnotationFilterForm annotation={annotationItem.data as Annotation} />
                    )}
                    selections={props.filters.map((filter) => filter.path)}
                    setSelections={() => dispatch(selection.actions.setFileFilters([]))}
                />
            )}
            onRenderEditMenuList={(item) => (
                <AnnotationFilterForm
                    annotation={pathToAnnotationMap.get(item.id) as Annotation}
                />
            )}
            rows={Object.entries(filtersGroupedByName).map(([pathKey, filters]) => {
                let operator = "EQUALS";
                if (filters.length > 1) operator = "ONE OF";
                else if (filters[0].type === FilterType.ANY) operator = "ANY VALUE";
                else if (filters[0].type === FilterType.EXCLUDE) operator = "NO VALUE";
                else if (filters[0].type === FilterType.FUZZY) operator = "CONTAINS";

                const annotation = pathToAnnotationMap.get(pathKey);
                // TODO: Fix once avoiding dot notation
                const path = pathKey.split(".");
                const leafName = path[path.length - 1];
                const titlePrefix = path.length > 1
                    ? path.slice(0, -1).join(" / ") + " / "
                    : undefined;
                const valueDisplay = map(filters, (filter) => filter.displayValue).join(", ");
                return {
                    id: filters[0].name,
                    title: `${leafName} ${operator} ${valueDisplay}`,
                    titlePrefix,
                    description: annotation?.description,
                };
            })}
        />
    );
}
