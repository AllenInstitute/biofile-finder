import * as React from "react";

interface SvgIcon {
    className?: string;
    height?: number | string;
    pathAttrs?: React.SVGProps<SVGPathElement>;
    pathData: string;
    width?: number | string;
    viewBox: string;
}

/**
 * A generalized SVG icon.
 */
const SvgIcon = React.forwardRef<SVGSVGElement, SvgIcon>((props, ref) => {
    const { className, height, pathAttrs, pathData, viewBox, width } = props;
    return (
        <svg
            className={className}
            height={height}
            preserveAspectRatio="xMidYMid"
            ref={ref}
            viewBox={viewBox}
            width={width}
        >
            <path {...pathAttrs} d={pathData}></path>
        </svg>
    );
});

SvgIcon.defaultProps = {
    height: 15,
    pathAttrs: {},
    width: 15,
};

export default SvgIcon;
