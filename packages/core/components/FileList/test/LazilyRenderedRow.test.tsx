import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";
import * as sinon from "sinon";

import Annotation from "../../../entity/Annotation";
import LazilyRenderedRow from "../LazilyRenderedRow";
import { initialState } from "../../../state";
import FileSet from "../../../entity/FileSet";

import styles from "../LazilyRenderedRow.module.css";

describe("<LazilyRenderedRow />", () => {
    const fileNameAnnotation = new Annotation({
        annotationDisplayName: "Name",
        annotationName: "file_name",
        description: "name of file",
        type: "Text",
    });

    function makeItemData() {
        const fileSet = new FileSet();
        sinon.stub(fileSet, "getFileByIndex").callsFake((index) => {
            if (index === 3) {
                return {
                    annotations: [
                        {
                            name: "someDateAnnotation",
                            values: ["2019-05-17T07:43:55.205Z"],
                        },
                    ],
                    channels: [],
                    file_id: "abc123",
                    file_name: "my_image.czi",
                    file_path: "some/path/to/my_image.czi",
                    file_size: 1,
                    positions: [],
                    someDateAnnotation: "2019-05-17T07:43:55.205Z",
                    times: [],
                    thumbnail: "",
                    uploaded: new Date().toISOString(),
                };
            }
        });

        return {
            fileSet,
            onContextMenu: sinon.spy(),
            onSelect: sinon.spy(),
        };
    }

    it("renders data when available", () => {
        // Arrange
        const state = mergeState(initialState, {});
        state.metadata.annotations = [fileNameAnnotation];
        state.selection.displayAnnotations = [fileNameAnnotation];

        const { store } = configureMockStore({ state });

        // Act
        const { getByText } = render(
            <Provider store={store}>
                <LazilyRenderedRow data={makeItemData()} index={3} style={{}} />
            </Provider>
        );

        // Assert
        expect(getByText("my_image.czi")).to.not.equal(null);
    });

    it("renders a loading indicator when data is not available", () => {
        // Arrange
        const state = mergeState(initialState, {});
        state.metadata.annotations = [fileNameAnnotation];
        state.selection.displayAnnotations = [fileNameAnnotation];

        const { store } = configureMockStore({ state });

        // Act
        const { queryByText } = render(
            <Provider store={store}>
                <LazilyRenderedRow data={makeItemData()} index={23} style={{}} />
            </Provider>
        );

        // Assert
        expect(queryByText("my_image.czi")).to.equal(null);
        expect(queryByText("Loading...")).to.not.equal(null);
    });

    describe("Dynamic styling", () => {
        [true, false].forEach((shouldDisplaySmallFont) => {
            it(`Has${
                shouldDisplaySmallFont ? "" : " no"
            } small font style when shouldDisplaySmallFont is ${shouldDisplaySmallFont}`, () => {
                // Arrange
                const { store } = configureMockStore({
                    state: mergeState(initialState, {
                        selection: {
                            shouldDisplaySmallFont,
                        },
                    }),
                });

                // Act
                const { getByText } = render(
                    <Provider store={store}>
                        <LazilyRenderedRow data={makeItemData()} index={23} style={{}} />
                    </Provider>
                );

                // Assert
                expect(getByText("Loading...").classList.contains(styles.smallFont)).to.equal(
                    shouldDisplaySmallFont
                );
            });
        });
    });
});
