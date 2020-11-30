import { configureMockStore, mergeState } from "@aics/redux-utils";
import { expect } from "chai";
import { mount } from "enzyme";
import * as React from "react";
import { Provider } from "react-redux";
import * as sinon from "sinon";

import Annotation from "../../../entity/Annotation";
import LazilyRenderedRow from "../LazilyRenderedRow";
import { initialState } from "../../../state";
import FileSet from "../../../entity/FileSet";

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
                    uploaded_by: "Them",
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
        const state = mergeState(initialState, {});
        state.metadata.annotations = [fileNameAnnotation];
        state.selection.displayAnnotations = [fileNameAnnotation];

        const { store } = configureMockStore({ state });
        const wrapper = mount(
            <Provider store={store}>
                <LazilyRenderedRow data={makeItemData()} index={3} style={{}} />
            </Provider>
        );

        const expectedTextNode = "my_image.czi";
        expect(wrapper.contains(expectedTextNode)).to.equal(true);
    });

    it("renders a loading indicator when data is not available", () => {
        const state = mergeState(initialState, {});
        state.metadata.annotations = [fileNameAnnotation];
        state.selection.displayAnnotations = [fileNameAnnotation];

        const { store } = configureMockStore({ state });
        const wrapper = mount(
            <Provider store={store}>
                <LazilyRenderedRow data={makeItemData()} index={23} style={{}} />
            </Provider>
        );

        const expectedTextNode = "Loading...";
        expect(wrapper.contains(expectedTextNode)).to.equal(true);
    });
});
