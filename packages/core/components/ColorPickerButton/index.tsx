import { Callout, ColorPicker } from "@fluentui/react";
import React, { ReactElement, useState } from "react";

type ColorPickerButtonProps = {
    /** Current hex color value, *not* prefixed with a `#`. */
    hexColor: string;
    onChange: (hexColor: string) => void;
};

export default function ColorPickerButton(props: ColorPickerButtonProps): ReactElement {
    const [isCalloutVisible, setIsCalloutVisible] = useState(false);
    const calloutRootRef = React.useRef<HTMLDivElement>(null);

    return (
        <>
            <div ref={calloutRootRef}>
                <button onClick={() => setIsCalloutVisible(!isCalloutVisible)}>Some button</button>
            </div>
            <Callout
                role="dialog"
                target={calloutRootRef.current}
                hidden={!isCalloutVisible}
                onDismiss={() => setIsCalloutVisible(false)}
            >
                <ColorPicker
                    color={"#" + props.hexColor}
                    onChange={(_e, color) => props.onChange(color.hex)}
                    alphaType="none"
                ></ColorPicker>
            </Callout>
        </>
    );
}
