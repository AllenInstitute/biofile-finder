import { configureMockStore, mergeState } from "@aics/redux-utils";
import { expect } from "chai";
import { mount } from "enzyme";
import * as React from "react";
import { Provider } from "react-redux";
import * as sinon from "sinon";

import Annotation from "../../../entity/Annotation";
import { FmsFile } from "../../../services/FileService";
import LazilyRenderedRow from "../LazilyRenderedRow";
import { initialState } from "../../../state";

describe("<LazilyRenderedRow />", () => {
    const fileNameAnnotation = new Annotation({
        annotation_display_name: "Name",
        annotation_name: "file_name",
        description: "name of file",
        type: "string",
    });

    function makeItemData() {
        const files = new Map<number, FmsFile>();
        files.set(3, { file_id: "abc123", file_name: "my_image.czi" });

        return {
            files,
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
