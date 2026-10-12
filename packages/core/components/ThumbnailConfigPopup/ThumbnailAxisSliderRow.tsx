import React, { ReactElement } from "react";

import LabeledSlider from "../LabeledSlider";
import { ZarrInfo } from "../../entity/FileDetail/RenderZarrThumbnailURL";

type ThumbnailAxisSliderRowProps = {
    id: string;
    className: string;
    axis: "t" | "c" | "z" | "x" | "y";
    zarrInfo?: ZarrInfo;
    value: number;
    /** Returns the relative value of the axis slider, in a [0, 1] range. */
    onChange?: (value: number) => void;
};

/**
 * Renders a slider row (slider + input) for adjusting the relative position of
 * a specific Zarr image axis.
 */
export default function ThumbnailAxisSliderRow(props: ThumbnailAxisSliderRowProps): ReactElement {
    const zarrDims = props.zarrInfo?.dimensions;
    const axisSize = zarrDims?.[props.axis];
    const hasDims = axisSize !== undefined;

    const min = 0;
    const max = hasDims ? axisSize - 1 : 100;

    const displayValue = Math.round(props.value * max);
    const onChange = (value: number) => {
        if (!Number.isFinite(value)) {
            return;
        }
        const max = hasDims ? axisSize - 1 : 100;
        value = Math.min(Math.max(value, 0), max) / max;
        props.onChange?.(value);
    };

    return (
        <LabeledSlider
            className={props.className}
            id={props.id}
            label={hasDims ? props.axis.toUpperCase() : `${props.axis.toUpperCase()}%`}
            labelFormatter={(value) => (hasDims ? `${value}` : `${value}%`)}
            value={displayValue}
            onChange={onChange}
            min={min}
            max={max}
            step={1}
        ></LabeledSlider>
    );
}
