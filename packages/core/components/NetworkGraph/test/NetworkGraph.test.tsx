import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";

import Graph from "../../../entity/Graph";
import FileServiceNoop from "../../../services/FileService/FileServiceNoop";

import NetworkGraph from "..";

describe("<NetworkGraph />", () => {
    it("todo", () => {
        // Arrange
        const graph = new Graph(new FileServiceNoop(), []);

        // Act
        const {} = render(<NetworkGraph graph={graph} origin={{} as any} />);

        // Assert
        expect(false).to.be.true;
    });
});
