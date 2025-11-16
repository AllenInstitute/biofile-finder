import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";

import DefaultEdge from "../..";


describe("<DefaultEdge />", () => {
    it("todo", () => {
        // Arrange
        // ...

        // Act
        const { getByText } = render(
            <DefaultEdge initialEdges={[]} initialNodes={[]} />
        );

        // Assert
        expect(false).to.be.true;
    });
});
