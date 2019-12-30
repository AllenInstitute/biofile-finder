import * as React from "react";

interface VirtualListInnerElementProps {
    style: React.CSSProperties;
}

/**
 * TODO
 */
function VirtualListInnerElement(
    { children, style }: React.PropsWithChildren<VirtualListInnerElementProps>,
    ref: React.Ref<HTMLDivElement>
) {
    return (
        <div ref={ref} style={Object.assign({}, style, { position: "relative" })}>
            {children}
        </div>
    );
}

export default React.forwardRef<
    HTMLDivElement,
    React.PropsWithChildren<VirtualListInnerElementProps>
>(VirtualListInnerElement);
