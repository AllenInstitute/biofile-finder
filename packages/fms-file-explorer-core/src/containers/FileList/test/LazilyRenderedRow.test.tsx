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
        annotation_display_name: "Name",
        annotation_name: "file_name",
        description: "name of file",
        type: "string",
    });

    function makeItemData() {
        const fileSet = new FileSet();
        sinon.stub(fileSet, "getFileByIndex").callsFake((index) => {
            if (index === 3) {
                return { file_id: "abc123", file_name: "my_image.czi" };
            }
        });

        return {
            fileSet,
            onSelect: sinon.spy(),
        };
    }

    it("renders data when available", () => {
        const state = mergeState(initialState, {
            metadata: {
                annotations: [fileNameAnnotation],
            },
            selection: {
                displayAnnotations: [fileNameAnnotation],
            },
        });
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
        const state = mergeState(initialState, {
            metadata: {
                annotations: [fileNameAnnotation],
            },
            selection: {
                displayAnnotations: [fileNameAnnotation],
            },
        });
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
