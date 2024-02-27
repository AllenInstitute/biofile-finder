import {
    configureMockStore,
    createMockHttpClient,
    mergeState,
    ResponseStub,
} from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import { get as _get } from "lodash";
import React from "react";
import { Provider } from "react-redux";
import { createSandbox } from "sinon";

import FileSelection from "../../../entity/FileSelection";
import FileSet from "../../../entity/FileSet";
import NumericRange from "../../../entity/NumericRange";
import HttpFileService from "../../../services/FileService/HttpFileService";
import { initialState, interaction } from "../../../state";

import AggregateInfoBox from "..";

describe("<AggregateInfoBox />", () => {
    const sandbox = createSandbox();
    const baseUrl = "test";
    const uniqueFileCount = 3413;
    const responseStubs: ResponseStub[] = [
        {
            when: (config) => _get(config, "url", "").includes(HttpFileService.SELECTION_AGGREGATE_URL),
            respondWith: {
                data: { data: [{ count: uniqueFileCount, size: 3 }] },
            },
        },
    ];
    const mockHttpClient = createMockHttpClient(responseStubs);
    const fileService = new HttpFileService({ baseUrl, httpClient: mockHttpClient });

    before(() => {
        sandbox.stub(interaction.selectors, "getFileService").returns(fileService);
    });

    afterEach(() => {
        sandbox.resetHistory();
    });

    after(() => {
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
