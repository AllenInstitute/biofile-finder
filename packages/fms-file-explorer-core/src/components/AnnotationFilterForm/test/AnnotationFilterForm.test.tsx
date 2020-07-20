import { configureMockStore, mergeState, createMockHttpClient } from "@aics/redux-utils";
import { fireEvent, render, wait } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";
import { createSandbox } from "sinon";

import AnnotationFilterForm from "../";
import Annotation from "../../../entity/Annotation";
import FileFilter from "../../../entity/FileFilter";
import { initialState, reducer, reduxLogics, interaction } from "../../../state";
import AnnotationService from "../../../services/AnnotationService";

describe("<AnnotationFilterForm />", () => {
    describe("Text annotations", () => {
        // setup
        const fooAnnotation = new Annotation({
            annotationDisplayName: "Foo",
            annotationName: "foo",
            description: "",
            type: "Text",
        });
        const annotations = [fooAnnotation];

        const responseStub = {
            when: `test/file-explorer-service/1.0/annotations/${fooAnnotation.name}/values`,
            respondWith: {
                data: { data: ["a", "b", "c", "d"] },
            },
        };
        const mockHttpClient = createMockHttpClient(responseStub);
        const annotationService = new AnnotationService({
            baseUrl: "test",
            httpClient: mockHttpClient,
        });

        const sandbox = createSandbox();

        before(() => {
            sandbox.stub(interaction.selectors, "getAnnotationService").returns(annotationService);
        });

        afterEach(() => {
            sandbox.resetHistory();
        });

        after(() => {
            sandbox.restore();
        });

        it("shows all values as unchecked at first", async () => {
            const state = mergeState(initialState, {
                metadata: {
                    annotations,
                },
            });

            const { store } = configureMockStore({ state, responseStubs: responseStub });

            const { findAllByRole } = render(
                <Provider store={store}>
                    <AnnotationFilterForm annotationName="foo" />
                </Provider>
            );

            // wait a couple render cycles for the async react hook to retrieve the annotation values
            const annotationValueListItems = await findAllByRole("listitem");

            expect(annotationValueListItems.length).to.equal(4);
            annotationValueListItems.forEach((listItem) => {
                expect(listItem.hasAttribute("checked")).to.equal(false);
            });
        });

        it("deselects and selects a value", async () => {
            // start with the input selected
            const state = mergeState(initialState, {
                metadata: {
                    annotations,
                },
                selection: {
                    filters: [new FileFilter(fooAnnotation.name, "b")],
                },
            });
            const { store, logicMiddleware } = configureMockStore({
                logics: reduxLogics,
                state,
                reducer,
                responseStubs: responseStub,
            });

            const { getByLabelText } = render(
                <Provider store={store}>
                    <AnnotationFilterForm annotationName={fooAnnotation.name} />
                </Provider>
            );

            // wait a couple render cycles for the async react hook to retrieve the annotation values
            await wait(async () =>
                // assert that the input is selected
                expect(getByLabelText("b").getAttribute("aria-checked")).to.equal("true")
            );

            // deselect the input
            fireEvent.click(getByLabelText("b"));
            await logicMiddleware.whenComplete();

            // assert that the input is deselected
            expect(getByLabelText("b").getAttribute("aria-checked")).to.equal("false");

            // select the input again
            fireEvent.click(getByLabelText("b"));
            await logicMiddleware.whenComplete();

            // assert that the input is selected again
            expect(getByLabelText("b").getAttribute("aria-checked")).to.equal("true");
        });
    });
    describe("Boolean annotations", () => {
        // setup
        const fooAnnotation = new Annotation({
            annotationDisplayName: "Foo",
            annotationName: "foo",
            description: "",
            type: "YesNo",
        });
        const annotations = [fooAnnotation];

        const responseStub = {
            when: `test/file-explorer-service/1.0/annotations/${fooAnnotation.name}/values`,
            respondWith: {
                data: { data: [true, false] },
            },
        };
        const mockHttpClient = createMockHttpClient(responseStub);
        const annotationService = new AnnotationService({
            baseUrl: "test",
            httpClient: mockHttpClient,
        });

        const sandbox = createSandbox();

        before(() => {
            sandbox.stub(interaction.selectors, "getAnnotationService").returns(annotationService);
        });

        afterEach(() => {
            sandbox.resetHistory();
        });

        after(() => {
            sandbox.restore();
        });

        it("shows all values as unchecked at first", async () => {
            // Arrange
            const state = mergeState(initialState, {
                metadata: {
                    annotations,
                },
            });
            const { store } = configureMockStore({ state, responseStubs: responseStub });
            // Act
            const { findAllByRole } = render(
                <Provider store={store}>
                    <AnnotationFilterForm annotationName="foo" />
                </Provider>
            );

            // Assert
            // Wait a couple render cycles for the async react hook to retrieve the annotation values
            const annotationValueListItems = await findAllByRole("listitem");

            expect(annotationValueListItems.length).to.equal(2);
            annotationValueListItems.forEach((listItem) => {
                expect(listItem.hasAttribute("checked")).to.equal(false);
            });
        });

        it.only("deselects and selects a value", async () => {
            // Arrange: Start with the "False" input selected
            const state = mergeState(initialState, {
                metadata: {
                    annotations,
                },
                selection: {
                    filters: [new FileFilter(fooAnnotation.name, false)],
                },
            });
            const { store, logicMiddleware } = configureMockStore({
                logics: reduxLogics,
                state,
                reducer,
                responseStubs: responseStub,
            });
            // Act
            const { getByLabelText } = render(
                <Provider store={store}>
                    <AnnotationFilterForm annotationName={fooAnnotation.name} />
                </Provider>
            );
            // Wait a couple render cycles for the async react hook to retrieve the annotation values
            await wait(async () =>
                // Assert: Check that the "False" input is selected
                expect(getByLabelText("False").getAttribute("aria-checked")).to.equal("true")
            );

            // Act: Deselect the "False" input
            fireEvent.click(getByLabelText("False"));
            await logicMiddleware.whenComplete();

            // Assert: Check that the "False" input is deselected
            expect(getByLabelText("False").getAttribute("aria-checked")).to.equal("false");

            // Act: Reselect the "False" input
            fireEvent.click(getByLabelText("False"));
            await logicMiddleware.whenComplete();

            // Assert: Check that the "False" input is selected again
            expect(getByLabelText("False").getAttribute("aria-checked")).to.equal("true");
        });
    });
});
