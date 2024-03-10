import { configureMockStore, mergeState, createMockHttpClient } from "@aics/redux-utils";
import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";
import { createSandbox } from "sinon";

import AnnotationFilterForm from "..";
import Annotation from "../../../entity/Annotation";
import FileFilter from "../../../entity/FileFilter";
import { initialState, reducer, reduxLogics, interaction } from "../../../state";
import HttpAnnotationService from "../../../services/AnnotationService/HttpAnnotationService";

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

        const sandbox = createSandbox();

        afterEach(() => {
            sandbox.restore();
        });

        it("shows all values as unchecked at first", async () => {
            // arrange
            const responseStub = {
                when: `test/file-explorer-service/1.0/annotations/${fooAnnotation.name}/values`,
                respondWith: {
                    data: { data: ["a", "b", "c", "d"] },
                },
            };
            const mockHttpClient = createMockHttpClient(responseStub);
            const annotationService = new HttpAnnotationService({
                baseUrl: "test",
                httpClient: mockHttpClient,
            });
            sandbox.stub(interaction.selectors, "getAnnotationService").returns(annotationService);

            const state = mergeState(initialState, {
                metadata: {
                    annotations,
                },
            });

            const { store } = configureMockStore({ state, responseStubs: responseStub });

            // act
            const { findAllByRole } = render(
                <Provider store={store}>
                    <AnnotationFilterForm annotationName="foo" />
                </Provider>
            );

            // wait a couple render cycles for the async react hook to retrieve the annotation values
            const annotationValueListItems = await findAllByRole("listitem");

            // assert
            expect(annotationValueListItems.length).to.equal(4);
            annotationValueListItems.forEach((listItem) => {
                expect(listItem.hasAttribute("checked")).to.equal(false);
            });
        });

        it("deselects and selects a value", async () => {
            // arrange
            const responseStub = {
                when: `test/file-explorer-service/1.0/annotations/${fooAnnotation.name}/values`,
                respondWith: {
                    data: { data: ["a", "b", "c", "d"] },
                },
            };
            const mockHttpClient = createMockHttpClient(responseStub);
            const annotationService = new HttpAnnotationService({
                baseUrl: "test",
                httpClient: mockHttpClient,
            });
            sandbox.stub(interaction.selectors, "getAnnotationService").returns(annotationService);

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

            // act
            const { getByLabelText } = render(
                <Provider store={store}>
                    <AnnotationFilterForm annotationName={fooAnnotation.name} />
                </Provider>
            );

            // wait a couple render cycles for the async react hook to retrieve the annotation values
            await waitFor(() =>
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

        it("naturally sorts values", async () => {
            // arrange
            const responseStub = {
                when: `test/file-explorer-service/1.0/annotations/${fooAnnotation.name}/values`,
                respondWith: {
                    data: { data: ["AICS-24", "AICS-0", "aics-32", "aICs-2"] },
                },
            };
            const mockHttpClient = createMockHttpClient(responseStub);
            const annotationService = new HttpAnnotationService({
                baseUrl: "test",
                httpClient: mockHttpClient,
            });
            sandbox.stub(interaction.selectors, "getAnnotationService").returns(annotationService);

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
            const expectedOrder = ["AICS-0", "aICs-2", "AICS-24", "aics-32"];
            annotationValueListItems.forEach((listItem, index) => {
                const { getByLabelText } = within(listItem);

                // getByLabelText will throw if it can't find a matching node
                expect(getByLabelText(expectedOrder[index])).to.not.be.undefined;
            });
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
        const annotationService = new HttpAnnotationService({
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

        it("deselects and selects a value", async () => {
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
            await waitFor(() =>
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

    describe("Number annotation", () => {
        const fooAnnotation = new Annotation({
            annotationDisplayName: "Foo",
            annotationName: "foo",
            description: "",
            type: "Number",
        });
        const annotations = [fooAnnotation];

        const sandbox = createSandbox();

        afterEach(() => {
            sandbox.restore();
        });

        it("naturally sorts values", async () => {
            // arrange
            const responseStub = {
                when: `test/file-explorer-service/1.0/annotations/${fooAnnotation.name}/values`,
                respondWith: {
                    data: { data: [5, 8, 6.3, -12, 10000000000, 0] },
                },
            };
            const mockHttpClient = createMockHttpClient(responseStub);
            const annotationService = new HttpAnnotationService({
                baseUrl: "test",
                httpClient: mockHttpClient,
            });
            sandbox.stub(interaction.selectors, "getAnnotationService").returns(annotationService);

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

            expect(annotationValueListItems.length).to.equal(6);
            const expectedOrder = [-12, 0, 5, 6.3, 8, 10000000000];
            annotationValueListItems.forEach((listItem, index) => {
                const { getByLabelText } = within(listItem);

                // getByLabelText will throw if it can't find a matching node
                expect(getByLabelText(String(expectedOrder[index]))).to.not.be.undefined;
            });
        });
    });

    describe("Duration annotation", () => {
        const fooAnnotation = new Annotation({
            annotationDisplayName: "Foo",
            annotationName: "foo",
            description: "",
            type: "Duration",
        });
        const annotations = [fooAnnotation];

        const sandbox = createSandbox();

        afterEach(() => {
            sandbox.restore();
        });

        it("naturally sorts values", async () => {
            // arrange
            const responseStub = {
                when: `test/file-explorer-service/1.0/annotations/${fooAnnotation.name}/values`,
                respondWith: {
                    data: { data: [446582220, 125, 10845000, 86400000] },
                },
            };
            const mockHttpClient = createMockHttpClient(responseStub);
            const annotationService = new HttpAnnotationService({
                baseUrl: "test",
                httpClient: mockHttpClient,
            });
            sandbox.stub(interaction.selectors, "getAnnotationService").returns(annotationService);

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
            expect(annotationValueListItems[0].textContent).to.equal("0.125S");
            expect(annotationValueListItems[1].textContent).to.equal("3H 45S");
            expect(annotationValueListItems[2].textContent).to.equal("1D");
            expect(annotationValueListItems[3].textContent).to.equal("5D 4H 3M 2.22S");
        });
    });
});
