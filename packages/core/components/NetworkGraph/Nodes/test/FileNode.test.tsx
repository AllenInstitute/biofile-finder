import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";

import FileNode from "../..";


describe("<FileNode />", () => {
    it("todo", () => {
        // Arrange
        // ...

        // Act
        const { getByText } = render(
            <FileNode initialEdges={[]} initialNodes={[]} />
        );

        // Assert
        expect(false).to.be.true;
    });
});
