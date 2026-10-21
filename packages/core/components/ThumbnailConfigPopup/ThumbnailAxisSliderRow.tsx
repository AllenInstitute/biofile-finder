import React, { ReactElement } from "react";

import LabeledSlider from "../LabeledSlider";
import { ZarrInfo } from "../../entity/FileDetail/RenderZarrThumbnailURL";

type ThumbnailAxisSliderRowProps = {
    id: string;
    className: string;
    axis: "t" | "c" | "z" | "x" | "y";
    zarrInfo?: ZarrInfo;
    /** Relative value of the axis slider, in a [0, 1] range. */
    value: number;
    /** Returns the relative value of the axis slider, in a [0, 1] range. */
    onChange?: (value: number) => void;
};

/**
 * Renders a slider row (slider + input) for adjusting the relative position of
 * a specific Zarr image axis. When no Zarr information is available, the slider
 * shows values as a percentage.
 */
export default function ThumbnailAxisSliderRow(props: ThumbnailAxisSliderRowProps): ReactElement {
    const zarrDims = props.zarrInfo?.dimensions;
    const axisSize = zarrDims?.[props.axis];
    const hasDims = axisSize !== undefined;

    // Bounds are [0, axisSize - 1] if axis size is known, otherwise [0, 100]
    // and displayed as a percentage.
    const minBound = 0;
    const maxBound = hasDims ? Math.max(axisSize - 1, 1) : 100;
    const displayValue = Math.round(props.value * maxBound);
    const onChange = (value: number) => {
        value = Math.min(Math.max(value, 0), maxBound) / maxBound;
        props.onChange?.(value);
    };

    return (
        <LabeledSlider
            className={props.className}
            id={props.id}
            label={props.axis.toUpperCase() + (hasDims ? "" : "%")}
            labelFormatter={(value) => value + (hasDims ? "" : "%")}
            value={displayValue}
            onChange={onChange}
            min={minBound}
            max={maxBound}
            step={1}
        ></LabeledSlider>
    );
}
