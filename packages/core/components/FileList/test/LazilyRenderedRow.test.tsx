import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";
import * as sinon from "sinon";

import Annotation from "../../../entity/Annotation";
import FileDetail from "../../../entity/FileDetail";
import FileSet from "../../../entity/FileSet";
import { initialState } from "../../../state";

import LazilyRenderedRow from "../LazilyRenderedRow";
import { Environment } from "../../../constants";

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
                return new FileDetail(
                    {
                        annotations: [
                            {
                                name: "someDateAnnotation",
                                values: ["2019-05-17T07:43:55.205Z"],
                            },
                        ],
                        file_id: "abc123",
                        file_name: "my_image.czi",
                        file_path: "some/path/to/my_image.czi",
                        file_size: 1,
                        thumbnail: "",
                        uploaded: new Date().toISOString(),
                    },
                    Environment.TEST
                );
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
        state.selection.columns = [{ name: fileNameAnnotation.name, width: 0.25 }];

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
});
