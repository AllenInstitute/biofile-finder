import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import { describe } from "mocha";
import * as React from "react";

import LabeledSlider from "..";
import { useState } from "react";

describe("<LabeledSlider />", () => {
    function TestSlider() {
        const [value, setValue] = useState(5);

        return (
            <LabeledSlider
                id="test-slider"
                label="Test Slider"
                value={value}
                onChange={(value) => {
                    setValue(value);
                }}
                min={0}
                max={10}
            />
        );
    }

    it("calls callback with new value on input change", () => {
        const { getByLabelText } = render(<TestSlider />);

        const input = getByLabelText("Test Slider") as HTMLInputElement;
        fireEvent.input(input, { target: { value: "7" } });
        fireEvent.blur(input);
        expect(input.value).to.equal("7");
    });

    it("clamps values at min and max bound", async () => {
        const { getByLabelText } = render(<TestSlider />);

        const input = getByLabelText("Test Slider") as HTMLInputElement;

        expect(input.value).to.equal("5");

        fireEvent.input(input, { target: { value: "10000" } });
        fireEvent.blur(input);
        expect(input.value).to.equal("10");

        fireEvent.input(input, { target: { value: "-10000" } });
        fireEvent.blur(input);
        expect(input.value).to.equal("0");
    });

    it("ignores non-numeric values", () => {
        const { getByLabelText } = render(<TestSlider />);

        const input = getByLabelText("Test Slider") as HTMLInputElement;

        expect(input.value).to.equal("5");

        fireEvent.input(input, { target: { value: "abc" } });
        fireEvent.blur(input);
        expect(input.value).to.equal("5");
    });
});
