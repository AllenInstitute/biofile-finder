import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";

import NetworkGraph from "..";


describe("<NetworkGraph />", () => {
    it("todo", () => {
        // Arrange
        // ...

        // Act
        const { getByText } = render(
            <NetworkGraph origin={{} as any} />
        );

        // Assert
        expect(false).to.be.true;
    });
});
