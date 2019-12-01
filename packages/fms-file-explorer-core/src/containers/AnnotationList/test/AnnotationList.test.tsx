import { expect } from "chai";
import { mount } from "enzyme";
import * as React from "react";
import { DragDropContext } from "react-beautiful-dnd";
import { Provider } from "react-redux";

import AnnotationList from "../";
import Annotation from "../../../entity/Annotation";
import ListItem from "../ListItem";
import { annotationsJson } from "./mocks";
import createMockReduxStore from "../../../state/test/mock-redux-store";

describe("<AnnotationList />", () => {
    describe("Search behavior", () => {
        it("filters list of annotations according to search input", () => {
            // setup
            const [store] = createMockReduxStore({
                mockState: {
                    metadata: {
                        annotations: annotationsJson.map(
                            (annotation) => new Annotation(annotation)
                        ),
                    },
                },
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
            const queryNumberListItems = () => wrapper.find(ListItem).children().length;

            // before, expect all annotations to be in the list
            const allAnnotationDisplayNames = annotationsJson.map(
                (annotation) => annotation.annotation_display_name
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
});
