import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";

import PrimaryButton from "../PrimaryButton";

describe("<PrimaryButton />", () => {
    it("does not perform click when disabled", () => {
        // Arrange
        const title = "Mock";
        let wasClicked = false;
        const onClick = () => {
            wasClicked = true;
        };

        const { getByText } = render(
            <PrimaryButton disabled onClick={onClick} iconName="Download" title={title} />
        );

        // (sanity-check) no click
        expect(wasClicked).to.be.false;

        // Act
        fireEvent.click(getByText(title));

        // Assert
        expect(wasClicked).to.be.false;
    });

    it("performs click when not disabled", () => {
        // Arrange
        const title = "Mock";
        let wasClicked = false;
        const onClick = () => {
            wasClicked = true;
        };

        const { getByText } = render(
            <PrimaryButton onClick={onClick} iconName="Download" title={title} />
        );

        // (sanity-check) no click
        expect(wasClicked).to.be.false;

        // Act
        fireEvent.click(getByText(title));

        // Assert
        expect(wasClicked).to.be.true;
    });
});
