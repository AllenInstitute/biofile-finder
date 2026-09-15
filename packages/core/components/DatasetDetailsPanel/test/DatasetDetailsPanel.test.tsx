import { configureMockStore, mergeState } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import { initialState } from "../../../state";

import DatasetDetailsPanel, { DatasetDetail } from "..";

describe("<DatasetDetailsPanel />", () => {
    const mockDescriptionShort = "This is a string that has 40 characters.";
    const mockDescriptionLong = mockDescriptionShort.repeat(100);
    const mockTitle = "Mock dataset";

    it("provides two different close buttons", () => {
        // Arrange
        const { store } = configureMockStore({
            state: initialState,
        });
        const { getAllByLabelText, getAllByRole } = render(
            <Provider store={store}>
                <DatasetDetailsPanel
                    datasetDetails={[]}
                    title={mockTitle}
                    description={mockDescriptionShort}
                />
            </Provider>
        );
        expect(getAllByRole("button").length).to.equal(2);
        expect(getAllByLabelText(/Close/).length).to.equal(2);
    });

    describe("show/hide full description", () => {
        const mockDatasetDetails: DatasetDetail[] = [
            { label: "date", value: "Wed Aug 26 2026" },
            { label: "authors", value: "A. Person" },
        ];
        it("hides the read more/less buttons for short descriptions", () => {
            // Arrange
            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    interaction: {
                        datasetDetailsPanelIsVisible: true,
                    },
                }),
            });
            const { getByText, queryByText } = render(
                <Provider store={store}>
                    <DatasetDetailsPanel
                        datasetDetails={mockDatasetDetails}
                        title={mockTitle}
                        description={mockDescriptionShort}
                    />
                </Provider>
            );

            // Act/Assert
            expect(getByText(mockDescriptionShort)).to.exist;
            expect(queryByText("Read more")).not.to.exist;
            expect(queryByText("Read less")).not.to.exist;
        });

        it("renders the read more button for long descriptions", () => {
            // Arrange
            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    interaction: {
                        datasetDetailsPanelIsVisible: true,
                    },
                }),
            });
            const { getByText, queryByText } = render(
                <Provider store={store}>
                    <DatasetDetailsPanel
                        datasetDetails={mockDatasetDetails}
                        title={mockTitle}
                        description={mockDescriptionLong}
                    />
                </Provider>
            );

            // Act/Assert
            expect(getByText(new RegExp(mockDescriptionShort, "i"))).to.exist;
            expect(queryByText("Read more")).to.exist;
            expect(queryByText("Read less")).not.to.exist;
        });

        it("renders only the read less button on click", async () => {
            // Arrange
            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    interaction: {
                        datasetDetailsPanelIsVisible: true,
                    },
                }),
            });
            const { getByText, findByText, queryByText } = render(
                <Provider store={store}>
                    <DatasetDetailsPanel
                        datasetDetails={mockDatasetDetails}
                        title={mockTitle}
                        description={mockDescriptionLong}
                    />
                </Provider>
            );

            // Act
            fireEvent.click(getByText("Read more"));

            // Assert
            expect(await findByText("Read less")).to.exist;
            expect(queryByText("Read more")).not.to.exist;
        });
    });
});
