import { IconButton } from "office-ui-fabric-react";
import * as React from "react";

import AnnotationFilterForm from "../../components/AnnotationFilterForm";

interface FilterProps {
    annotationName: string;
}

const FILTER_ICON = { iconName: "FilterSolid" };
const FILTERS_APPLIED_COLOR_INDICATOR = "orchid";
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

export default function AnnotationFilter(props: FilterProps) {
    const { annotationName } = props;

    const menuProps = React.useMemo(() => {
        return {
            onRenderMenuList: () => <AnnotationFilterForm annotationName={annotationName} />,
            title: "Filter",
            shouldFocusOnMount: true,
            items: [{ key: "placeholder" }], // necessary to have a non-empty items list to have `onRenderMenuList` called
        };
    }, [annotationName]);

    return (
        <IconButton
            iconProps={FILTER_ICON}
            menuProps={menuProps}
            styles={ICON_BUTTON_STYLE_OVERRIDES}
        />
    );
}
