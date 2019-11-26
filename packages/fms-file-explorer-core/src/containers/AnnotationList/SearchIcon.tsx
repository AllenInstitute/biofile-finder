import * as classNames from "classnames";
import * as React from "react";

interface SearchIconProps {
    className?: string;
    height: number;
    width: number;
}

/**
 * SVG element that renders a magnifying glass icon.
 *
 * Path data for icon taken from Material Design
 * Apache License 2.0 (https://github.com/google/material-design-icons/blob/master/LICENSE)
 */
export default function SearchIcon({ className, height, width }: SearchIconProps) {
    return (
        <svg className={classNames(className)} height={height} width={width} viewBox="0 0 24 24">
            <path d="M9.516 14.016q1.875 0 3.188-1.313t1.313-3.188-1.313-3.188-3.188-1.313-3.188 1.313-1.313 3.188 1.313 3.188 3.188 1.313zM15.516 14.016l4.969 4.969-1.5 1.5-4.969-4.969v-0.797l-0.281-0.281q-1.781 1.547-4.219 1.547-2.719 0-4.617-1.875t-1.898-4.594 1.898-4.617 4.617-1.898 4.594 1.898 1.875 4.617q0 0.984-0.469 2.227t-1.078 1.992l0.281 0.281h0.797z"></path>
        </svg>
    );
}

SearchIcon.defaultProps = {
    height: 17,
    width: 17,
};
