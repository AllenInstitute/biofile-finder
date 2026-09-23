import { configureMockStore, mergeState, createMockHttpClient } from "@aics/redux-utils";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";
import { createSandbox } from "sinon";

import AnnotationFilterForm from "..";
import Annotation from "../../../entity/Annotation";
import AnnotationName from "../../../entity/Annotation/AnnotationName";
import { AnnotationType } from "../../../entity/AnnotationFormatter";
import FileFilter, { FilterType } from "../../../entity/FileFilter";
import { initialState, reducer, reduxLogics, interaction, selection } from "../../../state";
import HttpAnnotationService from "../../../services/AnnotationService/HttpAnnotationService";
import { FESBaseUrl, TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";

describe("<AnnotationFilterForm />", () => {
    const LISTROW_TESTID_PREFIX = "default-button-";
    describe("Text annotations", () => {
        // setup
        const fooAnnotation = new Annotation({
            annotationDisplayName: "Foo",
            annotationName: "foo",
            description: "",
            type: AnnotationType.STRING,
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

        it("defaults to the search tab when there are more than 100 values", async () => {
            // arrange
            const responseStub = {
                when: `${FESBaseUrl.TEST}/file-explorer-service/1.0/annotations/${fooAnnotation.name}/values`,
                respondWith: {
                    data: { data: Array.from({ length: 101 }, (_, i) => `v${i}`) },
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
            const { findByDisplayValue, queryAllByRole } = render(
                <Provider store={store}>
                    <AnnotationFilterForm annotation={fooAnnotation} />
                </Provider>
            );

            // assert: the search tab's operator dropdown renders instead of the browse list
            expect(await findByDisplayValue("Contains")).to.exist;
            expect(queryAllByRole("listitem")).to.be.lengthOf(0);
        });

        it("defaults to the search tab when a Contains filter is already applied", async () => {
            // arrange: a short value list would normally default to the browse tab
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

            // start with a committed fuzzy ("Contains") filter for this annotation
            const state = mergeState(initialState, {
                selection: {
                    filters: [new FileFilter(fooAnnotation.name, "a", FilterType.FUZZY)],
                },
            });
            const { store } = configureMockStore({
                state,
                responseStubs: responseStub,
            });

            // act
            const { findByDisplayValue, queryAllByRole } = render(
                <Provider store={store}>
                    <AnnotationFilterForm annotation={fooAnnotation} />
                </Provider>
            );

            // assert: opens on the search tab (operator dropdown) instead of the browse list
            expect(await findByDisplayValue("Contains")).to.exist;
            expect(queryAllByRole("listitem")).to.be.lengthOf(0);
        });

        it("accumulates same-operator search values as chips", async () => {
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

            const state = mergeState(initialState, {
                selection: {
                    filters: [new FileFilter(fooAnnotation.name, "a")],
                },
            });
            const { store, logicMiddleware } = configureMockStore({
                logics: reduxLogics,
                state,
                reducer,
                responseStubs: responseStub,
            });

            const { findByText, getByRole, getByText } = render(
                <Provider store={store}>
                    <AnnotationFilterForm annotation={fooAnnotation} />
                </Provider>
            );

            // act: switch to the search tab; the committed value shows as a chip
            fireEvent.click(await findByText("Search"));
            expect(getByText("Exactly matches:")).to.exist;
            expect(getByText("a")).to.exist;

            // act: submit another value with the same operator
            const searchbox = getByRole("searchbox");
            fireEvent.change(searchbox, { target: { value: "b" } });
            fireEvent.keyDown(searchbox, { key: "Enter", code: "Enter", keyCode: 13 });
            await logicMiddleware.whenComplete();

            // assert: both values are filters now
            const filters = selection.selectors.getFileFilters(store.getState());
            expect(filters).to.be.lengthOf(2);
            expect(filters.map((filter) => filter.value)).to.deep.equal(["a", "b"]);
        });

        it("replaces committed filters when a different operator is submitted", async () => {
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

            const state = mergeState(initialState, {
                selection: {
                    filters: [new FileFilter(fooAnnotation.name, "a")],
                },
            });
            const { store, logicMiddleware } = configureMockStore({
                logics: reduxLogics,
                state,
                reducer,
                responseStubs: responseStub,
            });

            const { container, findByText, getByRole } = render(
                <Provider store={store}>
                    <AnnotationFilterForm annotation={fooAnnotation} />
                </Provider>
            );

            // act: switch to the search tab and select the Contains operator
            fireEvent.click(await findByText("Search"));
            fireEvent.click(container.querySelector(".ms-ComboBox button") as HTMLElement);
            fireEvent.click(await screen.findByText("Contains"));

            // act: submit a value with the new operator
            const searchbox = getByRole("searchbox");
            fireEvent.change(searchbox, { target: { value: "z" } });
            fireEvent.keyDown(searchbox, { key: "Enter", code: "Enter", keyCode: 13 });
            await logicMiddleware.whenComplete();

            // assert: the previous exact-match filter was replaced
            const filters = selection.selectors.getFileFilters(store.getState());
            expect(filters).to.be.lengthOf(1);
            expect(filters[0].value).to.equal("z");
            expect(filters[0].type).to.equal(FilterType.FUZZY);
        });
    });

    describe("Boolean annotations", () => {
        // setup
        const fooAnnotation = new Annotation({
            annotationDisplayName: "Foo",
            annotationName: "foo",
            description: "",
            type: AnnotationType.BOOLEAN,
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
                () => expect(getByTestId(`${LISTROW_TESTID_PREFIX}false`)).to.not.be.undefined
            );

            // (sanity-check): Check that the "False" input is selected
            expect(selection.selectors.getFileFilters(store.getState())).to.be.lengthOf(1);

            // Act: Deselect the "False" input
            fireEvent.click(getByTestId(`${LISTROW_TESTID_PREFIX}false`));
            await logicMiddleware.whenComplete();

            // Assert: Check that the "False" input is deselected
            expect(selection.selectors.getFileFilters(store.getState())).to.be.lengthOf(0);

            // Act: Reselect the "False" input
            fireEvent.click(getByTestId(`${LISTROW_TESTID_PREFIX}false`));
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
            type: AnnotationType.NUMBER,
        });

        const sandbox = createSandbox();

        afterEach(() => {
            sandbox.restore();
        });

        it("renders a NumberRangePicker instead of a list", async () => {
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

            const { findByTestId } = render(
                <Provider store={store}>
                    <AnnotationFilterForm annotation={fooAnnotation} />
                </Provider>
            );

            // NumberRangePicker renders min/max inputs with these test ids
            const minInput = await findByTestId("rangemin");
            const maxInput = await findByTestId("rangemax");

            // Values are naturally sorted so rangemin gets the overall min and rangemax the default max (overall max + 1)
            expect((minInput as HTMLInputElement).value).to.equal("-12");
            expect((maxInput as HTMLInputElement).value).to.equal("10000000001");
        });

        it("offers a Browse list tab that lists the values", async () => {
            const responseStub = {
                when: `${FESBaseUrl.TEST}/file-explorer-service/1.0/annotations/${fooAnnotation.name}/values`,
                respondWith: {
                    data: { data: [5, 8, 6.3] },
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

            const { findByText, getByTestId } = render(
                <Provider store={store}>
                    <AnnotationFilterForm annotation={fooAnnotation} />
                </Provider>
            );

            // act: switch from the (default) range inputs to the list of values
            fireEvent.click(await findByText("Browse list"));

            // assert: the list rows render
            expect(getByTestId("default-button-5")).to.exist;
            expect(getByTestId("default-button-8")).to.exist;
        });

        it("defaults to the Browse list tab when discrete (non-range) filters are already applied", async () => {
            // arrange: an annotation with existing browse-list filters (not range filters)
            const responseStub = {
                when: `${FESBaseUrl.TEST}/file-explorer-service/1.0/annotations/${fooAnnotation.name}/values`,
                respondWith: {
                    data: { data: [5, 8, 6.3] },
                },
            };
            const mockHttpClient = createMockHttpClient(responseStub);
            const annotationService = new HttpAnnotationService({
                fileExplorerServiceBaseUrl: FESBaseUrl.TEST,
                httpClient: mockHttpClient,
            });
            sandbox.stub(interaction.selectors, "getAnnotationService").returns(annotationService);

            const state = mergeState(initialState, {
                selection: {
                    filters: [new FileFilter(fooAnnotation.name, 5)],
                },
            });
            const { store } = configureMockStore({ state, responseStubs: responseStub });

            // act
            const { findByTestId, queryByRole } = render(
                <Provider store={store}>
                    <AnnotationFilterForm annotation={fooAnnotation} />
                </Provider>
            );

            // assert: opens directly on the Browse list tab (not the Range tab)
            expect(await findByTestId("default-button-5")).to.exist;
            expect(queryByRole("searchbox")).to.not.exist;
        });

        it("hides the Browse list tab for top-level file attributes whose values are never fetched", () => {
            // arrange
            const uploadedAnnotation = TOP_LEVEL_FILE_ANNOTATIONS.find(
                (annotation) => annotation.name === AnnotationName.UPLOADED
            ) as Annotation;
            const { store } = configureMockStore({ state: initialState });

            // act
            const { getByText, queryByText, queryByRole } = render(
                <Provider store={store}>
                    <AnnotationFilterForm annotation={uploadedAnnotation} />
                </Provider>
            );

            // assert: the range picker renders without a tab strip
            expect(getByText("Start of date range")).to.exist;
            expect(queryByRole("tablist")).to.not.exist;
            expect(queryByText("Browse list")).to.not.exist;
        });
    });

    describe("Duration annotation", () => {
        const fooAnnotation = new Annotation({
            annotationDisplayName: "Foo",
            annotationName: "foo",
            description: "",
            type: AnnotationType.DURATION,
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
