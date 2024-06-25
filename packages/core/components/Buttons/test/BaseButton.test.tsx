import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";

import BaseButton from "../BaseButton";

describe("<BaseButton />", () => {
    it("does not perform click when disabled", () => {
        // Arrange
        const title = "Mock";
        let wasClicked = false;
        const onClick = () => {
            wasClicked = true;
        };

        const { getByTitle } = render(
            <BaseButton disabled onClick={onClick} iconName="Download" title={title} />
        );

        // (sanity-check) no click
        expect(wasClicked).to.be.false;

        // Act
        fireEvent.click(getByTitle(title));

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

        const { getByTitle } = render(
            <BaseButton onClick={onClick} iconName="Download" title={title} />
        );

        // (sanity-check) no click
        expect(wasClicked).to.be.false;

        // Act
        fireEvent.click(getByTitle(title));

        // Assert
        expect(wasClicked).to.be.true;
    });
});
