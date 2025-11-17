import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";

import MetadataNode from "../..";


describe("<MetadataNode />", () => {
    it("todo", () => {
        // Arrange
        // ...

        // Act
        const { getByText } = render(
            <MetadataNode origin={{} as any} />
        );

        // Assert
        expect(false).to.be.true;
    });
});
