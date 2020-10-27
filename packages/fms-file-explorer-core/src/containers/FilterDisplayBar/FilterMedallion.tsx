import classNames from "classnames";
import { map } from "lodash";
import { IconButton } from "office-ui-fabric-react";
import * as React from "react";
import { useDispatch } from "react-redux";

import { selection } from "../../state";
import FileFilter from "../../entity/FileFilter";
import AnnotationFilter from "../AnnotationSidebar/AnnotationFilter";

const styles = require("./FilterMedallion.module.css");

interface Props {
    name: string;
    filters: FileFilter[];
}

const CLOSE_ICON = { iconName: "ChromeClose" };
const BUTTON_STYLES = {
    icon: {
        color: "black",
        fontSize: "8px",
    },
    menuIcon: {
        display: "none" as "none", // bizarre typings issue
    },
    root: {
        height: 22,
        width: 22,
        padding: 0,
    },
};

/**
 * UI for displaying the annotation values applied as file filters. Each `FileFilter` within `props.filters`
 * must relate to the same annotation (e.g. Each `FileFilter::name` should be equal).
 */
export default function FilterMedallion(props: Props) {
    const { filters, name } = props;
    const dispatch = useDispatch();

    const [expanded, setExpanded] = React.useState(false);
    const [overflowing, setOverflowing] = React.useState(false);
    const ref = React.useRef<HTMLElement | null>(null);

    // Determine if medallion has reached its max-width and text is overflowing
    // If a medallion is no longer overflowing but its "expanded" state is truthy, reset.
    React.useEffect(() => {
        if (ref.current) {
            const width = ref.current.clientWidth;
            const scrollWidth = ref.current.scrollWidth;
            const isOverflowing = scrollWidth > width;
            setOverflowing(isOverflowing);
            if (!isOverflowing) {
                setExpanded(false);
            }
        } else {
            setOverflowing(false);
        }
    }, [ref, filters]);

    const operator = filters.length > 1 ? "ONE OF" : "EQUALS";
    const valueDisplay = map(filters, (filter) => filter.value).join(", ");
    const display = `${name} ${operator} ${valueDisplay}`;

    return (
        <div className={styles.medallion}>
            <abbr
                className={classNames(styles.medallionText, {
                    [styles.expandable]: overflowing,
                    [styles.expanded]: expanded,
                })}
                onClick={() => overflowing && setExpanded((prev) => !prev)}
                ref={ref}
                title={display}
            >
                {display}
            </abbr>
            <span className={styles.spacer}></span>
            <AnnotationFilter annotationName={name} styleOverrides={{ root: BUTTON_STYLES.root }} />
            <IconButton
                iconProps={CLOSE_ICON}
                onClick={() => {
                    dispatch(selection.actions.removeFileFilter(filters));
                }}
                styles={BUTTON_STYLES}
            />
        </div>
    );
}
