import classNames from "classnames";
import { castArray, defaults } from "lodash";
import * as React from "react";

import styles from "./SvgIcon.module.css";

interface SvgIconProps {
    className?: string;
    height?: number | string;
    onClick?: () => void;
    pathAttrs?: React.SVGProps<SVGPathElement>;
    pathData: string | string[];
    width?: number | string;
    viewBox: string;
}

// forwardRef components cannot make use of React's defaultProps mechanism
const DEFAULT_PROPS = {
    height: 15,
    pathAttrs: {},
    width: 15,
};

/**
 * A generalized SVG icon.
 */
function SvgIcon(props: SvgIconProps, ref?: React.Ref<SVGSVGElement>) {
    const { className, height, onClick, pathAttrs, pathData, viewBox, width } = defaults(
        props,
        DEFAULT_PROPS
    );
    return (
        <svg
            className={classNames({ [styles.interactive]: onClick !== undefined }, className)}
            height={height}
            onClick={onClick}
            preserveAspectRatio="xMidYMid"
            ref={ref}
            viewBox={viewBox}
            width={width}
            style={{ minWidth: width }}
        >
            {castArray(pathData).map((pathSegment, index) => (
                <path {...pathAttrs} d={pathSegment} key={index}></path>
            ))}
        </svg>
    );
}

export default React.forwardRef<SVGSVGElement, SvgIconProps>(SvgIcon);
