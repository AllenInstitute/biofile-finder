import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import { describe } from "mocha";
import * as React from "react";

import ColorPickerButton from "..";

describe("<ColorPickerButton />", () => {
    it("calls callback with new color on input change", () => {
        const testId = "color-picker-button";
        let selectedColor;

        const { getByTestId, getByDisplayValue } = render(
            <ColorPickerButton
                id={testId}
                hexColor="ff0000"
                onChange={(color) => {
                    selectedColor = color;
                }}
            />
        );
        const button = getByTestId("base-button-" + testId);
        fireEvent.click(button);

        const hexInput = getByDisplayValue("ff0000");

        fireEvent.change(hexInput, { target: { value: "00ff00" } });
        expect(selectedColor).to.equal("00ff00");
    });
});
