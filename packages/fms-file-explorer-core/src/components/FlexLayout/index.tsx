import { isEmpty, pick } from "lodash";
import * as React from "react";

// see https://css-tricks.com/snippets/css/a-guide-to-flexbox/ for reference for what any of the flex properties mean
interface FlexLayoutProps {
    className?: string;
    htmlTag: keyof React.ReactHTML;

    // flex parent props
    alignItems?: string;
    alignContent?: string;
    flexDirection?: string;
    flexFlow?: string;
    flexParent: boolean; // this is the only made up property. determines whether display: flex is applied.
    flexWrap?: string;
    justifyContent?: string;

    // flex children props
    flex?: string;
    flexBasis?: string;
    flexGrow?: number;
    flexShrink?: number;
    order?: number;
}

const FLEX_PARENT_PROPS = [
    "flexDirection",
    "flexWrap",
    "flexFlow",
    "justifyContent",
    "alignItems",
    "alignContent",
];
const FLEX_CHILD_PROPS = ["order", "flexGrow", "flexShrink", "flexBasis", "flex"];
const FLEX_PROPS = [...FLEX_PARENT_PROPS, ...FLEX_CHILD_PROPS];

/**
 * A flex container. Can be either a flex parent, flex child, or both.
 */
export default function FlexLayout(props: React.PropsWithChildren<FlexLayoutProps>) {
    const flexStyle = pick(props, FLEX_PROPS);
    const styleProps = props.flexParent ? { display: "flex" } : {};
    if (!isEmpty(flexStyle)) {
        Object.assign(styleProps, flexStyle);
    }

    return React.createElement(
        props.htmlTag,
        { className: props.className, style: styleProps },
        props.children
    );
}

FlexLayout.defaultProps = {
    flexParent: false,
    htmlTag: "div",
};
