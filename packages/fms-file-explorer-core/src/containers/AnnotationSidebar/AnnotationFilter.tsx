import { IconButton } from "office-ui-fabric-react";
import * as React from "react";
import { useSelector } from "react-redux";

import AnnotationFilterForm from "../../components/AnnotationFilterForm";
import * as annotationSelectors from "./selectors";
import { State } from "../../state";

interface FilterProps {
    annotationName: string;
}

const FILTER_ICON = { iconName: "FilterSolid" };

const ICON_BUTTON_STYLE_OVERRIDES = {
    icon: {
        color: "black",
        fontSize: "0.5rem",
        marginLeft: 0,
    },
    menuIcon: {
        color: "black",
        fontSize: "0.5rem",
        marginLeft: 0,
    },
    root: {
        height: 18,
    },
};

// change the color of the icon from its default (black) to provide some indication
// to the user that a filter is applied
const FILTERS_APPLIED_COLOR_INDICATOR = "orchid";

export default function AnnotationFilter(props: FilterProps) {
    const { annotationName } = props;
    const annotationIsFilteredSelector = React.useMemo(
        annotationSelectors.makeAnnotationIsFilteredSelector,
        []
    );
    const annotationIsFiltered = useSelector((state: State) =>
        annotationIsFilteredSelector(state, annotationName)
    );

    const menuProps = React.useMemo(() => {
        return {
            onRenderMenuList() {
                return <AnnotationFilterForm annotationName={annotationName} />;
            },
            title: "Filter",
            shouldFocusOnMount: true,
            items: [{ key: "placeholder" }], // necessary to have a non-empty items list to have `onRenderMenuList` called
        };
    }, [annotationName]);

    // basic styling override improvements to office-ui-fabric-react's iconbutton
    // if this annotation is filtered, change the color of the filter icon as a subtle indication
    const iconButtonStyles = React.useMemo(() => {
        if (annotationIsFiltered) {
            return {
                ...ICON_BUTTON_STYLE_OVERRIDES,
                icon: {
                    ...ICON_BUTTON_STYLE_OVERRIDES.icon,
                    color: FILTERS_APPLIED_COLOR_INDICATOR,
                },
            };
        }

        return ICON_BUTTON_STYLE_OVERRIDES;
    }, [annotationIsFiltered]);

    return <IconButton iconProps={FILTER_ICON} menuProps={menuProps} styles={iconButtonStyles} />;
}
