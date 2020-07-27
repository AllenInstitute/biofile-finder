import { IconButton, DirectionalHint } from "office-ui-fabric-react";
import * as React from "react";
import { useSelector } from "react-redux";

import AnnotationFilterForm from "../AnnotationFilterForm";
import { selection } from "../../state";

interface FilterProps {
    annotationName: string;
    iconColor?: string;
}

const FILTER_ICON = { iconName: "FilterSolid" };

// change the color of the icon from its default (black) to provide some indication
// to the user that a filter is applied
const FILTERS_APPLIED_COLOR_INDICATOR = "orchid";

/**
 * A small icon button rendered inline next to annotation list items (and annotation hierarchy items).
 * On click, it renders a small form that allows the user to select annotation values with which to
 * filter the application's data.
 */
export default function AnnotationFilter(props: FilterProps) {
    const { annotationName, iconColor } = props;

    const fileFilters = useSelector(selection.selectors.getFileFilters);

    const annotationIsFiltered = React.useMemo(
        () => fileFilters.some((filter) => filter.name === annotationName),
        [fileFilters, annotationName]
    );

    const menuProps = React.useMemo(() => {
        return {
            onRenderMenuList() {
                return <AnnotationFilterForm annotationName={annotationName} />;
            },
            directionalHint: DirectionalHint.rightTopEdge,
            title: "Exclusively Include",
            shouldFocusOnMount: true,
            items: [{ key: "placeholder" }], // necessary to have a non-empty items list to have `onRenderMenuList` called
        };
    }, [annotationName]);

    // basic styling override improvements to office-ui-fabric-react's iconbutton
    // if this annotation is filtered, change the color of the filter icon as a subtle indication
    const iconButtonStyles = React.useMemo(() => {
        return {
            icon: {
                color: annotationIsFiltered ? FILTERS_APPLIED_COLOR_INDICATOR : iconColor,
                fontSize: "10px",
            },
            menuIcon: {
                display: "none" as "none", // bizarre typings issue
            },
            root: {
                height: 22,
            },
        };
    }, [annotationIsFiltered, iconColor]);

    return <IconButton iconProps={FILTER_ICON} menuProps={menuProps} styles={iconButtonStyles} />;
}

AnnotationFilter.defaultProps = {
    iconColor: "black",
};
