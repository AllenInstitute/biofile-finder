import classNames from "classnames";
import { map } from "lodash";
import * as React from "react";
import { useDispatch } from "react-redux";

import { REMOVE_ICON_PATH_DATA } from "../../icons";
import { selection } from "../../state";
import FileFilter from "../../entity/FileFilter";
import SvgIcon from "../../components/SvgIcon";

const styles = require("./FilterMedallion.module.css");

interface Props {
    name: string;
    filters: FileFilter[];
}

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
            <SvgIcon
                className={styles.closeIcon}
                height={15}
                onClick={() => {
                    dispatch(selection.actions.removeFileFilter(filters));
                }}
                pathData={REMOVE_ICON_PATH_DATA}
                viewBox="0 0 20 20"
                width={15}
            />
        </div>
    );
}
