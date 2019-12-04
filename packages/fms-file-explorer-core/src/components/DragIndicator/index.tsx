import * as classNames from "classnames";
import * as React from "react";

import SvgIcon from "../SvgIcon";

const styles = require("./DragIndicator.module.css");

// Designed Daniel Bruce (www.entypo.com)
// License: https://creativecommons.org/licenses/by-sa/4.0/
const DRAG_INDICATOR_ICON_PATH_DATA =
    "M15 15.984q0.797 0 1.406 0.609t0.609 1.406-0.609 1.406-1.406 0.609-1.406-0.609-0.609-1.406 0.609-1.406 1.406-0.609zM15 9.984q0.797 0 1.406 0.609t0.609 1.406-0.609 1.406-1.406 0.609-1.406-0.609-0.609-1.406 0.609-1.406 1.406-0.609zM15 8.016q-0.797 0-1.406-0.609t-0.609-1.406 0.609-1.406 1.406-0.609 1.406 0.609 0.609 1.406-0.609 1.406-1.406 0.609zM9 3.984q0.797 0 1.406 0.609t0.609 1.406-0.609 1.406-1.406 0.609-1.406-0.609-0.609-1.406 0.609-1.406 1.406-0.609zM9 9.984q0.797 0 1.406 0.609t0.609 1.406-0.609 1.406-1.406 0.609-1.406-0.609-0.609-1.406 0.609-1.406 1.406-0.609zM11.016 18q0 0.797-0.609 1.406t-1.406 0.609-1.406-0.609-0.609-1.406 0.609-1.406 1.406-0.609 1.406 0.609 0.609 1.406z";

interface DragIndicatorProps {
    disabled: boolean;
}

/**
 * An icon intended to communicate to a user that this is a draggable component.
 */
export default function DragIndicator({ disabled }: DragIndicatorProps) {
    return (
        <SvgIcon
            className={classNames(styles.dragIndicator, {
                [styles.disabled]: disabled,
            })}
            height={15}
            pathData={DRAG_INDICATOR_ICON_PATH_DATA}
            viewBox="0 0 24 24"
            width={15}
        />
    );
}

DragIndicator.defaultProps = {
    disabled: false,
};
