import { configureMockStore, mergeState } from "@aics/redux-utils";
import { expect } from "chai";
import { mount } from "enzyme";
import * as React from "react";
import { DragDropContext } from "react-beautiful-dnd";
import { Provider } from "react-redux";

import AnnotationList from "..";
import Annotation from "../../../entity/Annotation";
import { annotationsJson } from "../../../entity/Annotation/mocks";
import { initialState } from "../../../state";

describe("<AnnotationList />", () => {
    before(() => {
        // HACK: disable all react-beautiful-dnd development warnings. There appears to be an issue with its ability to use document.querySelectorAll in a JSDOM/Enzyme.mount context.
        (window as any)["__react-beautiful-dnd-disable-dev-warnings"] = true;
    });

    after(() => {
        // remove hack applied in before()
        delete (window as any)["__react-beautiful-dnd-disable-dev-warnings"];
    });

    describe("Search behavior", () => {
        it("filters list of annotations according to search input", () => {
            // setup
            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    metadata: {
                        annotations: annotationsJson.map(
                            (annotation) => new Annotation(annotation)
                        ),
                    },
                }),
            });

            const wrapper = mount(
                <Provider store={store}>
                    <DragDropContext
                        onDragEnd={() => {
                            /* noop */
                        }}
                    >
                        <AnnotationList />
                    </DragDropContext>
                </Provider>
            );
            const queryNumberListItems = () =>
                wrapper.find("span[data-test-id='annotation-list-item']").length;

            // before, expect all annotations to be in the list
            const allAnnotationDisplayNames = annotationsJson.map(
                (annotation) => annotation.annotationDisplayName
            );
            expect(queryNumberListItems()).to.equal(allAnnotationDisplayNames.length);
            allAnnotationDisplayNames.forEach((annotation) => {
                expect(wrapper.contains(annotation)).to.be.true;
            });

            // execute a search
            wrapper
                .find("input[type='search']")
                .simulate("change", { target: { value: "created" } });

            // after, expect a filtered list, and for it to include only annotations similar to search input
            expect(queryNumberListItems()).to.be.lessThan(allAnnotationDisplayNames.length);
            expect(wrapper.contains("Date created")).to.be.true;
            expect(wrapper.contains("Size")).to.be.false;
        });
    });

    describe("List Order", () => {
        it("sorts list alphabetically", () => {
            // Arrange
            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    metadata: {
                        annotations: annotationsJson.map(
                            (annotation) => new Annotation(annotation)
                        ),
                    },
                }),
            });
            // Act
            const wrapper = mount(
                <Provider store={store}>
                    <DragDropContext
                        onDragEnd={() => {
                            /* noop */
                        }}
                    >
                        <AnnotationList />
                    </DragDropContext>
                </Provider>
            );

            const listItemsWrapper = wrapper.find("span[data-test-id='annotation-list-item']");
            const listItems = listItemsWrapper.map((node) => node.text());
            const expectation = annotationsJson
                .map((annotation) => annotation.annotationDisplayName)
                .sort((a, b) => a.localeCompare(b));

            // Assert
            expect(listItems).to.be.deep.equal(expectation);
        });

        it("continues to sort when filtered", () => {
            // Arrange
            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    metadata: {
                        annotations: annotationsJson.map(
                            (annotation) => new Annotation(annotation)
                        ),
                    },
                }),
            });
            // Act
            const wrapper = mount(
                <Provider store={store}>
                    <DragDropContext
                        onDragEnd={() => {
                            /* noop */
                        }}
                    >
                        <AnnotationList />
                    </DragDropContext>
                </Provider>
            );

            // Execute a search against the annotations
            wrapper.find("input[type='search']").simulate("change", { target: { value: "e" } });

            const filterdListItemsWrapper = wrapper.find(
                "span[data-test-id='annotation-list-item']"
            );
            const filterdListItems = filterdListItemsWrapper.map((node) => node.text());
            const expectation = filterdListItems.sort((a, b) => a.localeCompare(b));
            // Assert
            expect(filterdListItems).to.be.deep.equal(expectation);
        });
    });
});
