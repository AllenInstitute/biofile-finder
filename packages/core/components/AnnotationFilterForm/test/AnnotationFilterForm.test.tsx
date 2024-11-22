import { configureMockStore, mergeState, createMockHttpClient } from "@aics/redux-utils";
import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";
import { createSandbox } from "sinon";

import AnnotationFilterForm from "..";
import Annotation from "../../../entity/Annotation";
import FileFilter from "../../../entity/FileFilter";
import { initialState, reducer, reduxLogics, interaction, selection } from "../../../state";
import HttpAnnotationService from "../../../services/AnnotationService/HttpAnnotationService";
import { FESBaseUrl } from "../../../constants";

describe("<AnnotationFilterForm />", () => {
    const LISTROW_TESTID_PREFIX = "default-button-";
    describe("Text annotations", () => {
        // setup
        const fooAnnotation = new Annotation({
            annotationDisplayName: "Foo",
            annotationName: "foo",
            description: "",
            type: "Text",
        });

        const sandbox = createSandbox();

        afterEach(() => {
            sandbox.restore();
        });

        it("shows all values as unchecked at first", async () => {
            // arrange
            const responseStub = {
                when: `${FESBaseUrl.TEST}/file-explorer-service/1.0/annotations/${fooAnnotation.name}/values`,
                respondWith: {
                    data: { data: ["a", "b", "c", "d"] },
                },
            };
            const mockHttpClient = createMockHttpClient(responseStub);
            const annotationService = new HttpAnnotationService({
                fileExplorerServiceBaseUrl: FESBaseUrl.TEST,
                httpClient: mockHttpClient,
            });
            sandbox.stub(interaction.selectors, "getAnnotationService").returns(annotationService);

            const { store } = configureMockStore({
                state: initialState,
                responseStubs: responseStub,
            });

            // act
            const { findAllByRole } = render(
                <Provider store={store}>
                    <AnnotationFilterForm annotation={fooAnnotation} />
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
                when: `${FESBaseUrl.TEST}/file-explorer-service/1.0/annotations/${fooAnnotation.name}/values`,
                respondWith: {
                    data: { data: ["a", "b", "c", "d"] },
                },
            };
            const mockHttpClient = createMockHttpClient(responseStub);
            const annotationService = new HttpAnnotationService({
                fileExplorerServiceBaseUrl: FESBaseUrl.TEST,
                httpClient: mockHttpClient,
            });
            sandbox.stub(interaction.selectors, "getAnnotationService").returns(annotationService);

            // start with the input selected
            const state = mergeState(initialState, {
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
            const { getByTestId } = render(
                <Provider store={store}>
                    <AnnotationFilterForm annotation={fooAnnotation} />
                </Provider>
            );
            await waitFor(
                () => expect(getByTestId(`${LISTROW_TESTID_PREFIX}b`)).to.not.be.undefined
            );

            // (sanity-check): Check that the "b" input is selected
            expect(selection.selectors.getFileFilters(store.getState())).to.be.lengthOf(1);

            // Act: Deselect the "False" input
            fireEvent.click(getByTestId(`${LISTROW_TESTID_PREFIX}b`));
            await logicMiddleware.whenComplete();

            // Assert: Check that the "b" input is deselected
            expect(selection.selectors.getFileFilters(store.getState())).to.be.lengthOf(0);

            // Act: Reselect the "b" input
            fireEvent.click(getByTestId(`${LISTROW_TESTID_PREFIX}b`));
            await logicMiddleware.whenComplete();

            // Assert: Check that the "False" input is selected again
            expect(selection.selectors.getFileFilters(store.getState())).to.be.lengthOf(1);
        });

        it("naturally sorts values", async () => {
            // arrange
            const responseStub = {
                when: `${FESBaseUrl.TEST}/file-explorer-service/1.0/annotations/${fooAnnotation.name}/values`,
                respondWith: {
                    data: { data: ["AICS-24", "AICS-0", "aics-32", "aICs-2"] },
                },
            };
            const mockHttpClient = createMockHttpClient(responseStub);
            const annotationService = new HttpAnnotationService({
                fileExplorerServiceBaseUrl: FESBaseUrl.TEST,
                httpClient: mockHttpClient,
            });
            sandbox.stub(interaction.selectors, "getAnnotationService").returns(annotationService);

            const { store } = configureMockStore({
                state: initialState,
                responseStubs: responseStub,
            });

            const { findAllByRole } = render(
                <Provider store={store}>
                    <AnnotationFilterForm annotation={fooAnnotation} />
                </Provider>
            );

            // wait a couple render cycles for the async react hook to retrieve the annotation values
            const annotationValueListItems = await findAllByRole("listitem");

            expect(annotationValueListItems.length).to.equal(4);
            const expectedOrder = ["AICS-0", "aICs-2", "AICS-24", "aics-32"];
            annotationValueListItems.forEach((listItem, index) => {
                const { getByTestId } = within(listItem);

                // getByLabelText will throw if it can't find a matching node
                expect(getByTestId(`${LISTROW_TESTID_PREFIX}${expectedOrder[index]}`)).to.not.be
                    .undefined;
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

        const responseStub = {
            when: `${FESBaseUrl.TEST}/file-explorer-service/1.0/annotations/${fooAnnotation.name}/values`,
            respondWith: {
                data: { data: [true, false] },
            },
        };
        const mockHttpClient = createMockHttpClient(responseStub);
        const annotationService = new HttpAnnotationService({
            fileExplorerServiceBaseUrl: FESBaseUrl.TEST,
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
            const { store } = configureMockStore({
                state: initialState,
                responseStubs: responseStub,
            });
            // Act
            const { findAllByRole } = render(
                <Provider store={store}>
                    <AnnotationFilterForm annotation={fooAnnotation} />
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
            const { getByTestId } = render(
                <Provider store={store}>
                    <AnnotationFilterForm annotation={fooAnnotation} />
                </Provider>
            );
            await waitFor(
                () => expect(getByTestId(`${LISTROW_TESTID_PREFIX}False`)).to.not.be.undefined
            );

            // (sanity-check): Check that the "False" input is selected
            expect(selection.selectors.getFileFilters(store.getState())).to.be.lengthOf(1);

            // Act: Deselect the "False" input
            fireEvent.click(getByTestId(`${LISTROW_TESTID_PREFIX}False`));
            await logicMiddleware.whenComplete();

            // Assert: Check that the "False" input is deselected
            expect(selection.selectors.getFileFilters(store.getState())).to.be.lengthOf(0);

            // Act: Reselect the "False" input
            fireEvent.click(getByTestId(`${LISTROW_TESTID_PREFIX}False`));
            await logicMiddleware.whenComplete();

            // Assert: Check that the "False" input is selected again
            expect(selection.selectors.getFileFilters(store.getState())).to.be.lengthOf(1);
        });
    });

    describe("Number annotation", () => {
        const fooAnnotation = new Annotation({
            annotationDisplayName: "Foo",
            annotationName: "foo",
            description: "",
            type: "Number",
        });

        const sandbox = createSandbox();

        afterEach(() => {
            sandbox.restore();
        });

        it("naturally sorts values", async () => {
            // arrange
            const responseStub = {
                when: `${FESBaseUrl.TEST}/file-explorer-service/1.0/annotations/${fooAnnotation.name}/values`,
                respondWith: {
                    data: { data: [5, 8, 6.3, -12, 10000000000, 0] },
                },
            };
            const mockHttpClient = createMockHttpClient(responseStub);
            const annotationService = new HttpAnnotationService({
                fileExplorerServiceBaseUrl: FESBaseUrl.TEST,
                httpClient: mockHttpClient,
            });
            sandbox.stub(interaction.selectors, "getAnnotationService").returns(annotationService);

            const { store } = configureMockStore({
                state: initialState,
                responseStubs: responseStub,
            });

            const { findAllByRole } = render(
                <Provider store={store}>
                    <AnnotationFilterForm annotation={fooAnnotation} />
                </Provider>
            );

            // wait a couple render cycles for the async react hook to retrieve the annotation values
            const annotationValueListItems = await findAllByRole("listitem");

            expect(annotationValueListItems.length).to.equal(6);
            const expectedOrder = [-12, 0, 5, 6.3, 8, 10000000000];
            annotationValueListItems.forEach((listItem, index) => {
                const { getByTestId } = within(listItem);

                // getByLabelText will throw if it can't find a matching node
                expect(getByTestId(`${LISTROW_TESTID_PREFIX}${expectedOrder[index]}`)).to.not.be
                    .undefined;
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

        const sandbox = createSandbox();

        afterEach(() => {
            sandbox.restore();
        });

        it("naturally sorts values", async () => {
            // arrange
            const responseStub = {
                when: `${FESBaseUrl.TEST}/file-explorer-service/1.0/annotations/${fooAnnotation.name}/values`,
                respondWith: {
                    data: { data: [446582220, 125, 10845000, 86400000] },
                },
            };
            const mockHttpClient = createMockHttpClient(responseStub);
            const annotationService = new HttpAnnotationService({
                fileExplorerServiceBaseUrl: FESBaseUrl.TEST,
                httpClient: mockHttpClient,
            });
            sandbox.stub(interaction.selectors, "getAnnotationService").returns(annotationService);

            const { store } = configureMockStore({
                state: initialState,
                responseStubs: responseStub,
            });

            const { findAllByRole } = render(
                <Provider store={store}>
                    <AnnotationFilterForm annotation={fooAnnotation} />
                </Provider>
            );

            // wait a couple render cycles for the async react hook to retrieve the annotation values
            const annotationValueListItems = await findAllByRole("listitem");

            expect(annotationValueListItems.length).to.equal(4);
            expect(annotationValueListItems[0].textContent).to.contain("0.125S");
            expect(annotationValueListItems[1].textContent).to.contain("3H 45S");
            expect(annotationValueListItems[2].textContent).to.contain("1D");
            expect(annotationValueListItems[3].textContent).to.contain("5D 4H 3M 2.22S");
        });
    });
});
