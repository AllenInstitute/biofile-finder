import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import React from "react";
import { Provider } from "react-redux";
import { createSandbox } from "sinon";

import FileSelection from "../../../entity/FileSelection";
import FileSet from "../../../entity/FileSet";
import NumericRange from "../../../entity/NumericRange";
import { SelectionAggregationResult } from "../../../services/FileService";
import FileServiceNoop from "../../../services/FileService/FileServiceNoop";
import { initialState, interaction } from "../../../state";

import AggregateInfoBox from "..";

describe("<AggregateInfoBox />", () => {
    const sandbox = createSandbox();
    const uniqueFileCount = 3413;

    afterEach(() => {
        sandbox.restore();
    });

    const state = mergeState(initialState, {
        selection: {
            fileSelection: new FileSelection().select({
                fileSet: new FileSet(),
                index: new NumericRange(0, 100),
                sortOrder: 0,
            }),
        },
    });

    it("displays nothing when no files are selected", () => {
        // Arrange
        const { store } = configureMockStore({
            state: initialState,
        });

        const mockFileService = new FileServiceNoop();
        sandbox.stub(interaction.selectors, "getFileService").returns(mockFileService);

        const { getByText, getAllByTestId } = render(
            <Provider store={store}>
                <AggregateInfoBox />
            </Provider>
        );

        // Assert
        expect(() => getAllByTestId("aggregate-info-box-spinner")).to.throw();
        expect(() => getByText("Total Files")).to.throw();
    });

    it("renders loading spinner when data has yet to load", async () => {
        // Arrange
        const { store } = configureMockStore({
            state,
        });

        const mockFileService = new FileServiceNoop();
        sandbox.stub(interaction.selectors, "getFileService").returns(mockFileService);

        const { getAllByTestId } = render(
            <Provider store={store}>
                <AggregateInfoBox />
            </Provider>
        );

        // Assert
        expect(getAllByTestId("aggregate-info-box-spinner")).to.exist;
    });

    it("renders aggregated file size", async () => {
        // Arrange
        const { store } = configureMockStore({
            state,
        });

        class MockFileService extends FileServiceNoop {
            public async getAggregateInformation(): Promise<SelectionAggregationResult> {
                return { size: 3, count: uniqueFileCount };
            }
        }
        const mockFileService = new MockFileService();
        sandbox.stub(interaction.selectors, "getFileService").returns(mockFileService);

        const { findByText } = render(
            <Provider store={store}>
                <AggregateInfoBox />
            </Provider>
        );

        // Assert
        expect(await findByText((content) => content.endsWith("Size"))).to.exist;
        expect(await findByText("3 B")).to.exist;
    });

    it("renders aggregated total file count", async () => {
        // Arrange
        const { store } = configureMockStore({
            state,
        });

        class MockFileService extends FileServiceNoop {
            public async getAggregateInformation(): Promise<SelectionAggregationResult> {
                return { size: 1, count: uniqueFileCount };
            }
        }
        const mockFileService = new MockFileService();
        sandbox.stub(interaction.selectors, "getFileService").returns(mockFileService);

        const { findByText, findAllByText } = render(
            <Provider store={store}>
                <AggregateInfoBox />
            </Provider>
        );

        // Assert
        expect(await findAllByText((content) => content.endsWith("Selected"))).to.lengthOf(2);
        expect(await findByText("101")).to.exist;
    });

    it("renders aggregated unique file count", async () => {
        // Arrange
        const { store } = configureMockStore({
            state,
        });

        class MockFileService extends FileServiceNoop {
            public async getAggregateInformation(): Promise<SelectionAggregationResult> {
                return { size: 4, count: uniqueFileCount };
            }
        }
        const mockFileService = new MockFileService();
        sandbox.stub(interaction.selectors, "getFileService").returns(mockFileService);

        const { findByText } = render(
            <Provider store={store}>
                <AggregateInfoBox />
            </Provider>
        );

        // Assert
        expect(await findByText((content) => content.startsWith("Unique"))).to.exist;
        expect(await findByText(`${uniqueFileCount}`)).to.exist;
    });
});
