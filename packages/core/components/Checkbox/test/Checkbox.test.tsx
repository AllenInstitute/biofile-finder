import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";

import Checkbox from "..";

describe("<Checkbox />", () => {
    it("does not perform check when disabled", () => {
        // Arrange
        const label = "Mock";
        let wasChecked = false;
        const onChange = () => (wasChecked = true);

        const { getByText } = render(<Checkbox disabled onChange={onChange} label={label} />);

        // (consistency check) no click
        expect(wasChecked).to.be.false;

        // Act
        fireEvent.click(getByText(label));

        // Assert
        expect(wasChecked).to.be.false;
    });

    it("performs click when not disabled", () => {
        // Arrange
        const label = "Mock";
        let wasChecked = false;
        const onChange = () => (wasChecked = true);

        const { getByText } = render(<Checkbox onChange={onChange} label={label} />);

        // (consistency check) no click
        expect(wasChecked).to.be.false;

        // Act
        fireEvent.click(getByText(label));

        // Assert
        expect(wasChecked).to.be.true;
    });
});
