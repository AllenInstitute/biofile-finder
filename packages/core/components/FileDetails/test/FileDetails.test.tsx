import { configureMockStore } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import FileDetails from "../";
import { initialState } from "../../../state";

describe("<FileDetails />", () => {
    describe("Expand and collapse behavior", () => {
        it("renders minimize and maximize buttons when at its default size", () => {
            // Arrange
            const { store } = configureMockStore({ state: initialState });
            const { queryByLabelText } = render(
                <Provider store={store}>
                    <FileDetails />
                </Provider>
            );

            // Act / Assert
            ["Minimize details window", "Maximize details window"].forEach(async (label) => {
                expect(queryByLabelText(label)).to.not.equal(null);
            });

            expect(queryByLabelText("Restore details window")).to.equal(null);
        });

        it("renders restore and maximize buttons when it is minimized", async () => {
            // Arrange
            const { store } = configureMockStore({ state: initialState });
            const { findByLabelText, queryByLabelText } = render(
                <Provider store={store}>
                    <FileDetails />
                </Provider>
            );

            // Act
            fireEvent.click(await findByLabelText("Minimize details window"));

            // Assert
            ["Restore details window", "Maximize details window"].forEach((label) => {
                expect(queryByLabelText(label)).to.not.equal(null);
            });

            expect(queryByLabelText("Minimize details window")).to.equal(null);
        });

        it("renders restore and minimize buttons when it is maximized", async () => {
            // Arrange
            const { store } = configureMockStore({ state: initialState });
            const { findByLabelText, queryByLabelText } = render(
                <Provider store={store}>
                    <FileDetails />
                </Provider>
            );

            // Act
            fireEvent.click(await findByLabelText("Maximize details window"));

            ["Restore details window", "Minimize details window"].forEach((label) => {
                expect(queryByLabelText(label)).to.not.equal(null);
            });

            expect(queryByLabelText("Maximize details window")).to.equal(null);
        });
    });
});
