import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";
import * as sinon from "sinon";

import LazilyRenderedThumbnail from "../LazilyRenderedThumbnail";
import { initialState } from "../../../state";
import FileSet from "../../../entity/FileSet";
import FileDetail from "../../../entity/FileDetail";
import { FileView } from "../../../entity/SearchParams";
import { Environment } from "../../../constants";

describe("<LazilyRenderedThumbnail />", () => {
    function makeItemData() {
        const fileSet = new FileSet();
        sinon.stub(fileSet, "getFileByIndex").callsFake((index) => {
            if (index === 0) {
                return new FileDetail(
                    {
                        annotations: [],
                        file_id: "abc1230",
                        file_name: "my_image0.czi",
                        file_path: "some/path/to/my_image0.czi",
                        file_size: 1,
                        thumbnail: "some/path/to/my_image0.jpg",
                        uploaded: new Date().toISOString(),
                    },
                    Environment.TEST
                );
            }
            if (index === 9) {
                return new FileDetail(
                    {
                        annotations: [],
                        file_id: "abc1239",
                        file_name: "my_image9.jpg",
                        file_path: "some/path/to/my_image9.jpg",
                        file_size: 1,
                        uploaded: new Date().toISOString(),
                    },
                    Environment.TEST
                );
            }
            if (index === 25) {
                return new FileDetail(
                    {
                        annotations: [],
                        file_id: "abc12325",
                        file_name: "my_image25.czi",
                        file_path: "some/path/to/my_image25.czi",
                        file_size: 1,
                        uploaded: new Date().toISOString(),
                    },
                    Environment.TEST
                );
            }
        });

        return {
            fileSet,
            measuredWidth: 600,
            itemCount: 100,
            onContextMenu: sinon.spy(),
            onSelect: sinon.spy(),
        };
    }

    it("renders thumbnail when file has one specified", async () => {
        // Arrange
        const state = mergeState(initialState, {});
        const { store } = configureMockStore({ state });

        // Act
        const { getAllByText, findByRole } = render(
            <Provider store={store}>
                <LazilyRenderedThumbnail
                    data={makeItemData()}
                    rowIndex={0}
                    columnIndex={0}
                    style={{}}
                />
            </Provider>
        );

        // Assert
        // Also checking for proper row/col indexing
        const thumbnail = await findByRole("img");
        expect(thumbnail.getAttribute("src")).to.include("some/path/to/my_image0.jpg");
        expect(getAllByText("my_image0.czi")).to.not.be.empty;
    });

    it("renders file as thumbnail if file is renderable type", async () => {
        // Arrange
        const { store } = configureMockStore({
            state: mergeState(initialState, {
                selection: {
                    fileView: FileView.LARGE_THUMBNAIL,
                },
            }),
        });

        // Act
        const { getAllByText, findByRole } = render(
            <Provider store={store}>
                <LazilyRenderedThumbnail
                    data={makeItemData()}
                    rowIndex={1}
                    columnIndex={4}
                    style={{}}
                />
            </Provider>
        );

        // Assert
        // Also confirms proper row/col indexing
        const thumbnail = await findByRole("img");
        expect(thumbnail.getAttribute("src")).to.include("some/path/to/my_image9.jpg");
        expect(getAllByText("my_image9.jpg")).to.not.be.empty;
    });

    it("renders svg as thumbnail if file has no renderable thumbnail", () => {
        // Arrange
        const { store } = configureMockStore({
            state: mergeState(initialState, {
                selection: {
                    fileView: FileView.LARGE_THUMBNAIL,
                },
            }),
        });

        // Act
        const { getAllByText, queryByRole } = render(
            <Provider store={store}>
                <LazilyRenderedThumbnail
                    data={makeItemData()}
                    rowIndex={5}
                    columnIndex={0}
                    style={{}}
                />
            </Provider>
        );

        // Assert
        // Also confirms proper row/col indexing
        expect(".no-thumbnail").to.exist;
        expect(".svg").to.exist;
        expect(queryByRole("img")).not.to.exist;
        expect(getAllByText("my_image25.czi")).to.not.be.empty;
    });

    it("renders a loading indicator when data is not available", () => {
        // Arrange
        const { store } = configureMockStore({ state: initialState });

        // Act
        const { queryByText, queryAllByTestId } = render(
            <Provider store={store}>
                <LazilyRenderedThumbnail
                    data={makeItemData()}
                    rowIndex={2}
                    columnIndex={3}
                    style={{}}
                />
            </Provider>
        );

        // Assert
        expect(queryByText("my_image")).to.equal(null);
        expect(queryAllByTestId("loading-spinner")).to.not.be.empty;
    });

    // We want to be able to render empty cells past the total item count in order to fill the grid
    it("renders an empty cell if the index is past the total item count", () => {
        // Arrange
        const { store } = configureMockStore({ state: initialState });

        // Act
        const { queryByText, queryAllByTestId } = render(
            <Provider store={store}>
                <LazilyRenderedThumbnail
                    data={makeItemData()}
                    rowIndex={20}
                    columnIndex={5}
                    style={{}}
                />
            </Provider>
        );

        // Assert
        expect(queryByText("my_image")).to.equal(null);
        expect(queryAllByTestId("loading-spinner")).to.be.empty;
    });

    it("renders and indexes correctly with different number of columns", () => {
        // Arrange
        const state = {
            ...initialState,
            selection: {
                ...initialState.selection,
                fileView: FileView.SMALL_THUMBNAIL,
            },
        };
        const { store } = configureMockStore({ state });

        // Act
        const { getAllByText } = render(
            <Provider store={store}>
                <LazilyRenderedThumbnail
                    data={makeItemData()}
                    rowIndex={2}
                    columnIndex={5}
                    style={{}}
                />
            </Provider>
        );

        // Assert
        expect(".no-thumbnail").to.exist;
        expect(".svg").to.exist;
        expect(getAllByText("my_image25.czi")).to.not.be.empty;
    });
});
