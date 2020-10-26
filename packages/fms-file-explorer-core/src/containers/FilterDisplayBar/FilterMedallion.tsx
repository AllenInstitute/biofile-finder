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
 * UI for displaying the annotation values applies as file filters for a single annotation.
 * Each `FileFilter` within `props.filters` must related to the same annotation (e.g. `FileFilter.name`
 * for each should be equal).
 */
export default function FilterMedallion(props: Props) {
    const { filters, name } = props;
    const [expand, setExpand] = React.useState(false);
    const dispatch = useDispatch();

    const operator = filters.length > 1 ? "ONE OF" : "EQUALS";
    const valueDisplay = map(filters, (filter) => filter.value).join(", ");
    const display = `${name} ${operator} ${valueDisplay}`;
    return (
        <div className={styles.medallion}>
            <abbr
                className={classNames(styles.medallionText, { [styles.expanded]: expand })}
                onClick={() => setExpand((prev) => !prev)}
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
