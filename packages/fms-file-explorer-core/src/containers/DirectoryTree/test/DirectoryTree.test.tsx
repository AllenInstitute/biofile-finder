import {
    configureMockStore,
    createMockHttpClient,
    mergeState,
    ResponseStub,
} from "@aics/redux-utils";
import { expect } from "chai";
import { get as _get, range, tail } from "lodash";
import * as React from "react";
import { fireEvent, render, wait, findByTestId } from "@testing-library/react";
import { Provider } from "react-redux";
import { createSandbox } from "sinon";

import { TOP_LEVEL_FILE_ANNOTATIONS, AnnotationName } from "../../../constants";
import Annotation from "../../../entity/Annotation";
import AnnotationService from "../../../services/AnnotationService";
import FileService, { FmsFile } from "../../../services/FileService";
import FileFilter from "../../../entity/FileFilter";
import {
    initialState,
    interaction,
    reducer,
    reduxLogics,
    selection,
 } from "../../../state";

import DirectoryTree from "../";

const styles = require("../DirectoryTreeNode.module.css");

describe("<DirectoryTree />", () => {
    const sandbox = createSandbox();

    // SO MUCH SETUP
    const expectedTopLevelHierarchyValues = ["first", "second", "third", "fourth"];
    const expectedSecondLevelHierarchyValues = ["a", "b", "c"];

    const annotations = [
        new Annotation({
            annotationDisplayName: "Foo",
            annotationName: "foo",
            description: "",
            type: "Text",
        }),
        new Annotation({
            annotationDisplayName: "Bar",
            annotationName: "bar",
            description: "",
            type: "Text",
        }),
    ];

    const baseUrl = "test";
    const state = mergeState(initialState, {
        interaction: {
            fileExplorerServiceBaseUrl: baseUrl,
        },
        selection: {
            annotationHierarchy: annotations,
            displayAnnotations: TOP_LEVEL_FILE_ANNOTATIONS.filter((a) => a.name === AnnotationName.FILE_NAME),
        },
    });

    const files: FmsFile[] = range(50).map((idx) => {
        const fileName = `file_${idx}.img`;
        return ({
            annotations: [],
            fileId: String(idx),
            fileName,
            filePath: `/isilon/${fileName}`,
            fileSize: 1000,
            uploaded: "Sun Aug 19 22:51:22 GMT 2018",
            uploadedBy: "Human",
        });
    });

    const responseStubs: ResponseStub[] = [
        {
            when: (config) =>
                _get(config, "url", "").includes(
                    AnnotationService.BASE_ANNOTATION_HIERARCHY_ROOT_URL
                ),
            respondWith: {
                data: { data: expectedTopLevelHierarchyValues },
            },
        },
        {
            when: (config) =>
                _get(config, "url", "").includes(
                    AnnotationService.BASE_ANNOTATION_HIERARCHY_UNDER_PATH_URL
                ),
            respondWith: {
                data: { data: expectedSecondLevelHierarchyValues },
            },
        },
        {
            when: (config) => _get(config, "url", "").includes(FileService.BASE_FILE_COUNT_URL),
            respondWith: {
                data: { data: [42] },
            },
        },
        {
            when: (config) => _get(config, "url", "").includes(FileService.BASE_FILES_URL),
            respondWith: {
                data: { data: files },
            }
        }
    ];
    const mockHttpClient = createMockHttpClient(responseStubs);
    const annotationService = new AnnotationService({ baseUrl, httpClient: mockHttpClient });
    const fileService = new FileService({ baseUrl, httpClient: mockHttpClient });

    before(() => {
        sandbox.stub(interaction.selectors, "getAnnotationService").returns(annotationService);
        sandbox.stub(interaction.selectors, "getFileService").returns(fileService);
    });

    afterEach(() => {
        sandbox.resetHistory();
    });

    after(() => {
        sandbox.restore();
    });

    it("renders the top level of the hierarchy", async () => {
        const { store } = configureMockStore({ state, responseStubs });

        const { getByText, findAllByRole } = render(
            <Provider store={store}>
                <DirectoryTree />
            </Provider>
        );

        // wait for the requests for data
        const directoryTreeNodes = await findAllByRole("treeitem");

        // expect the top level annotation values to be in the dom
        expect(directoryTreeNodes.length).to.equal(4);
        expectedTopLevelHierarchyValues.forEach((value) => {
            expect(getByText(value)).to.exist.and.to.be.instanceOf(HTMLElement);
        });
    });

    it("collapses and expands sub-levels of the annotation hierarchy", async () => {
        const { store } = configureMockStore({
            state,
            responseStubs,
            reducer,
            logics: reduxLogics,
        });

        const { getByText, findByText } = render(
            <Provider store={store}>
                <DirectoryTree />
            </Provider>
        );

        // wait for the requests for annotation values at the top level of the hierarchy
        const topLevelValue = await findByText(expectedTopLevelHierarchyValues[0]);

        // click on the tree item
        fireEvent.click(topLevelValue);

        // it's children should appear
        await findByText(expectedSecondLevelHierarchyValues[2]);

        // click the tree item again and its children should disappear
        fireEvent.click(topLevelValue);

        // getByText will throw if it can't find the element
        expect(() => getByText(expectedSecondLevelHierarchyValues[2])).to.throw();
    });

    it("renders a listing of files at its leaf nodes", async () => {
        const { store } = configureMockStore({
            state,
            responseStubs,
            reducer,
            logics: reduxLogics,
        });

        const { findByText } = render(
            <Provider store={store}>
                <DirectoryTree />
            </Provider>
        );

        // wait for the requests for annotation values at the top level of the hierarchy
        const topLevelValue = await findByText(expectedTopLevelHierarchyValues[0]);

        // click on the tree item
        fireEvent.click(topLevelValue);

        // it's children should appear
        const secondLevelValue = await findByText(expectedSecondLevelHierarchyValues[2]);

        // click the tree item again and its children should disappear
        fireEvent.click(secondLevelValue);

        // find a file row -- will throw an exception if the listing of files is not rendered
        await findByText("file_1.img");
    });

    it("is filtered by user selected annotation value filters", async () => {
        const { store } = configureMockStore({
            state,
            responseStubs,
            reducer,
            logics: reduxLogics,
        });

        const { getByText, findAllByRole } = render(
            <Provider store={store}>
                <DirectoryTree />
            </Provider>
        );

        const topLevelAnnotation = annotations[0];

        // wait for the requests for data
        expect((await findAllByRole("treeitem")).length).to.equal(
            expectedTopLevelHierarchyValues.length
        );
        expectedTopLevelHierarchyValues.forEach((value) => {
            expect(getByText(String(value))).to.exist;
        });

        // simulate a user filtering the list of top level hierarchy values
        const filterValue = expectedTopLevelHierarchyValues[0];
        store.dispatch(selection.actions.addFileFilter(new FileFilter(topLevelAnnotation.name, filterValue)));

        // after going through the store and an update cycle or two, the tree should be filtered
        // down to just the one annotation value selected
        await wait(async () => expect((await findAllByRole("treeitem")).length).to.equal(1));
        expect(getByText(String(filterValue))).to.exist;

        // the remainder should be gone from the DOM
        tail(expectedTopLevelHierarchyValues).forEach((value) => {
            expect(() => getByText(String(value))).to.throw();
        });
    });

    it("gains then loses focus when a context menu is summoned elsewhere", async () => {
        const { store } = configureMockStore({
            state,
            responseStubs,
            reducer,
            logics: reduxLogics,
        });

        const { findAllByRole } = render(
            <Provider store={store}>
                <DirectoryTree />
            </Provider>
        );

        // wait for the requests for data
        const directoryTreeNodes = await findAllByRole("treeitem");

        // expect the top level annotation headers to be in the dom
        expect(directoryTreeNodes.length).to.equal(4);

        // set baseline for tests
        let firstHeader = await findByTestId(directoryTreeNodes[0], "treeitemheader");
        let secondHeader = await findByTestId(directoryTreeNodes[1], "treeitemheader");
        expect(firstHeader.classList.contains(styles.focused)).to.be.false;
        expect(secondHeader.classList.contains(styles.focused)).to.be.false;

        // right-click on a tree item header
        fireEvent.contextMenu(firstHeader);
        firstHeader = await findByTestId(directoryTreeNodes[0], "treeitemheader"); // refresh node
        secondHeader = await findByTestId(directoryTreeNodes[1], "treeitemheader"); // refresh node
        expect(firstHeader.classList.contains(styles.focused)).to.be.true;
        expect(secondHeader.classList.contains(styles.focused)).to.be.false;

        // right-click on another tree item header
        fireEvent.contextMenu(secondHeader);
        firstHeader = await findByTestId(directoryTreeNodes[0], "treeitemheader"); // refresh node
        secondHeader = await findByTestId(directoryTreeNodes[1], "treeitemheader"); // refresh node
        expect(firstHeader.classList.contains(styles.focused)).to.be.false;
        expect(secondHeader.classList.contains(styles.focused)).to.be.true;
    });

    it("maintains focus after double right click", async () => {
        const { store } = configureMockStore({
            state,
            responseStubs,
            reducer,
            logics: reduxLogics,
        });

        const { findAllByRole } = render(
            <Provider store={store}>
                <DirectoryTree />
            </Provider>
        );

        // wait for the requests for data
        const directoryTreeNodes = await findAllByRole("treeitem");

        // expect the top level annotation headers to be in the dom
        expect(directoryTreeNodes.length).to.equal(4);

        // set baseline for tests
        let header = await findByTestId(directoryTreeNodes[0], "treeitemheader");
        expect(header.classList.contains(styles.focused)).to.be.false;

        // right-click on a tree item header
        fireEvent.contextMenu(header);
        header = await findByTestId(directoryTreeNodes[0], "treeitemheader"); // refresh node
        expect(header.classList.contains(styles.focused)).to.be.true;

        // right-click on again on the same tree item header
        fireEvent.contextMenu(header);
        header = await findByTestId(directoryTreeNodes[0], "treeitemheader"); // refresh node
        expect(header.classList.contains(styles.focused)).to.be.true;
    });
});
