import {
    configureMockStore,
    createMockHttpClient,
    mergeState,
    ResponseStub,
} from "@aics/redux-utils";
import { expect } from "chai";
import { get as _get, range, tail } from "lodash";
import * as React from "react";
import {
    fireEvent,
    render,
    waitFor,
    findByTestId,
    getByText as getByTextWithin,
    findAllByText as findAllByTextWithin,
    findByRole as findByRoleWithin,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { createSandbox } from "sinon";

import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";
import Annotation from "../../../entity/Annotation";
import AnnotationName from "../../../entity/Annotation/AnnotationName";
import { FmsFileAnnotation } from "../../../services/FileService";
import FileFilter from "../../../entity/FileFilter";
import FileDownloadServiceNoop from "../../../services/FileDownloadService/FileDownloadServiceNoop";
import HttpFileService from "../../../services/FileService/HttpFileService";
import HttpAnnotationService from "../../../services/AnnotationService/HttpAnnotationService";
import { initialState, interaction, reducer, reduxLogics, selection } from "../../../state";

import DirectoryTree from "../";

import styles from "../DirectoryTreeNode.module.css";

describe("<DirectoryTree />", () => {
    const sandbox = createSandbox();

    // SO MUCH SETUP
    const topLevelHierarchyValues = ["first", "second", "third", "fourth"];
    const secondLevelHierarchyValues = ["a", "b", "c"];

    const fooAnnotation = new Annotation({
        annotationDisplayName: "Foo",
        annotationName: "foo",
        description: "",
        type: "Text",
    });
    const barAnnotation = new Annotation({
        annotationDisplayName: "Bar",
        annotationName: "bar",
        description: "",
        type: "Text",
    });

    const baseUrl = "http://test-aics.corp.alleninstitute.org";
    const baseDisplayAnnotations = TOP_LEVEL_FILE_ANNOTATIONS.filter(
        (a) => a.name === AnnotationName.FILE_NAME
    );
    const state = mergeState(initialState, {
        metadata: {
            annotations: [...baseDisplayAnnotations, fooAnnotation, barAnnotation],
        },
        interaction: {
            fileExplorerServiceBaseUrl: baseUrl,
        },
        selection: {
            annotationHierarchy: [fooAnnotation.name, barAnnotation.name],
            columns: [...baseDisplayAnnotations, fooAnnotation, barAnnotation].map((a) => ({
                name: a.name,
                width: 0.1,
            })),
        },
    });

    const makeFmsFile = (idx: number, annotations: FmsFileAnnotation[] = []) => {
        const fileName = `file_${idx}.img`;
        return {
            annotations,
            file_id: String(idx),
            file_name: fileName,
            file_path: `/isilon/${fileName}`,
            file_size: 1000,
            uploaded: "Sun Aug 19 22:51:22 GMT 2018",
        };
    };

    const totalFilesCount = 15;

    // A set of files maps to the following query string: foo=first&bar=b
    const fooFirstBarBFiles = range(totalFilesCount).map((idx) => {
        const foo = {
            name: fooAnnotation.name,
            values: [topLevelHierarchyValues[0]],
        };
        const bar = {
            name: barAnnotation.name,
            values: [secondLevelHierarchyValues[1]],
        };
        return makeFmsFile(idx, [foo, bar]);
    });

    // A set of files maps to the following query string: foo=first&bar=c
    const fooFirstBarCFiles = range(totalFilesCount).map((idx) => {
        const foo = {
            name: fooAnnotation.name,
            values: [topLevelHierarchyValues[0]],
        };
        const bar = {
            name: barAnnotation.name,
            values: [secondLevelHierarchyValues[2]],
        };
        return makeFmsFile(idx, [foo, bar]);
    });

    // A set of files maps to the following query string: foo=first
    const fooFirstFiles = range(totalFilesCount).map((idx) => {
        const foo = {
            name: fooAnnotation.name,
            values: [topLevelHierarchyValues[0]],
        };
        return makeFmsFile(idx, [foo]);
    });

    const responseStubs: ResponseStub[] = [
        {
            when: (config) =>
                _get(config, "url", "").includes(
                    HttpAnnotationService.BASE_ANNOTATION_HIERARCHY_ROOT_URL
                ),
            respondWith: {
                data: { data: topLevelHierarchyValues },
            },
        },
        {
            when: (config) =>
                _get(config, "url", "").includes(
                    HttpAnnotationService.BASE_ANNOTATION_HIERARCHY_UNDER_PATH_URL
                ),
            respondWith: {
                data: { data: secondLevelHierarchyValues },
            },
        },
        {
            when: (config) => _get(config, "url", "").includes(HttpFileService.BASE_FILE_COUNT_URL),
            respondWith: {
                data: { data: [totalFilesCount] },
            },
        },
        {
            when: (config) => {
                const url = new URL(_get(config, "url", ""));
                return (
                    url.pathname.includes(HttpFileService.BASE_FILES_URL) &&
                    url.searchParams.get(fooAnnotation.name) === "first" &&
                    url.searchParams.get(barAnnotation.name) === "b"
                );
            },
            respondWith: {
                data: {
                    data: fooFirstBarBFiles,
                },
            },
        },
        {
            when: (config) => {
                const url = new URL(_get(config, "url", ""));
                return (
                    url.pathname.includes(HttpFileService.BASE_FILES_URL) &&
                    url.searchParams.get(fooAnnotation.name) === "first" &&
                    url.searchParams.get(barAnnotation.name) === "c"
                );
            },
            respondWith: {
                data: {
                    data: fooFirstBarCFiles,
                },
            },
        },
        {
            when: (config) => {
                const url = new URL(_get(config, "url", ""));
                return (
                    url.pathname.includes(HttpFileService.BASE_FILES_URL) &&
                    url.searchParams.get(fooAnnotation.name) === "first" &&
                    !url.searchParams.has(barAnnotation.name)
                );
            },
            respondWith: {
                data: {
                    data: fooFirstFiles,
                },
            },
        },
    ];
    const mockHttpClient = createMockHttpClient(responseStubs);
    const annotationService = new HttpAnnotationService({ baseUrl, httpClient: mockHttpClient });
    const fileService = new HttpFileService({
        baseUrl,
        httpClient: mockHttpClient,
        downloadService: new FileDownloadServiceNoop(),
    });

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
        topLevelHierarchyValues.forEach((value) => {
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
        const topLevelValue = await findByText(topLevelHierarchyValues[0]);

        // click on the tree item
        fireEvent.click(topLevelValue);

        // it's children should appear
        await findByText(secondLevelHierarchyValues[2]);

        // click the tree item again and its children should disappear
        fireEvent.click(topLevelValue);

        // getByText will throw if it can't find the element
        expect(() => getByText(secondLevelHierarchyValues[2])).to.throw();
    });

    it("renders a badge of how many selections are found underneath a folder", async () => {
        const { store } = configureMockStore({
            state,
            responseStubs,
            reducer,
            logics: reduxLogics,
        });

        const { findByText, getByText } = render(
            <Provider store={store}>
                <DirectoryTree />
            </Provider>
        );

        // wait for the requests for annotation values at the top level of the hierarchy
        const topLevelFolder = await findByText(topLevelHierarchyValues[0]);

        // click on the top level folder
        fireEvent.click(topLevelFolder);

        // select 5 files underneath one of the leaf folders
        const secondLevelFolder1 = await findByText(secondLevelHierarchyValues[1]);
        fireEvent.click(secondLevelFolder1);
        fireEvent.click(await findByText(fooFirstBarBFiles[0].file_name));
        fireEvent.click(await findByText(fooFirstBarBFiles[4].file_name), { shiftKey: true });

        // selection count badge should be found
        await findByText("5 selections");

        // close folder selections were just made within to disambiguate which file rows were trying to select
        fireEvent.click(secondLevelFolder1);

        // select 3 files underneath another of the leaf folders
        const secondLevelFolder2 = await findByText(secondLevelHierarchyValues[2]);
        fireEvent.click(secondLevelFolder2);
        fireEvent.click(await findByText(fooFirstBarCFiles[0].file_name), { ctrlKey: true });
        fireEvent.click(await findByText(fooFirstBarCFiles[2].file_name), { shiftKey: true });

        await findByText("3 selections");

        // collapse top level directory
        fireEvent.click(topLevelFolder);

        // selection badge count should now be the sum of selections underneath top level folder
        // the '5 selections' and '3 selections' badges should now be gone
        expect(getByText("8 selections")).to.exist;
        expect(() => getByText("5 selections")).to.throw();
        expect(() => getByText("3 selections")).to.throw();

        // open up the top level folder again and the '8 selections' badge should be gone
        // the 3 and 5 selection badges should be back
        fireEvent.click(topLevelFolder);
        expect(getByText("5 selections")).to.exist;
        expect(getByText("3 selections")).to.exist;
        expect(() => getByText("8 selections")).to.throw();
    });

    it("is filtered by user selected annotation value filters", async () => {
        const { store } = configureMockStore({
            state,
            responseStubs,
            reducer,
            logics: reduxLogics,
        });

        const { findAllByRole, getByText } = render(
            <Provider store={store}>
                <DirectoryTree />
            </Provider>
        );

        // wait for the requests for data
        expect((await findAllByRole("treeitem")).length).to.equal(topLevelHierarchyValues.length);
        topLevelHierarchyValues.forEach((value) => {
            expect(getByText(String(value))).to.exist;
        });

        // simulate a user filtering the list of top level hierarchy values
        const topLevelFilter = topLevelHierarchyValues[0];
        store.dispatch(
            selection.actions.addFileFilter(new FileFilter(fooAnnotation.name, topLevelFilter))
        );

        // after going through the store and an update cycle or two, the tree should be filtered
        // down to just the one annotation value selected
        await waitFor(async () => expect((await findAllByRole("treeitem")).length).to.equal(1));
        expect(getByText(topLevelFilter)).to.exist;

        // the remainder top level items should should be gone from the DOM
        tail(topLevelHierarchyValues).forEach((value) => {
            expect(() => getByText(value)).to.throw();
        });
    });

    it("only includes one filter value per annotation for an annotation within the hierarchy", async () => {
        const oneAnnotationDeepState = mergeState(initialState, {
            metadata: {
                annotations: [...baseDisplayAnnotations, fooAnnotation, barAnnotation],
            },
            interaction: {
                fileExplorerServiceBaseUrl: baseUrl,
            },
            selection: {
                annotationHierarchy: [fooAnnotation.name],
                columns: [...baseDisplayAnnotations, fooAnnotation, barAnnotation].map((a) => ({
                    name: a.name,
                    width: 0.1,
                })),
            },
        });

        const { store } = configureMockStore({
            state: oneAnnotationDeepState,
            responseStubs,
            reducer,
            logics: reduxLogics,
        });

        const { findAllByRole, findByText, getByText } = render(
            <Provider store={store}>
                <DirectoryTree />
            </Provider>
        );

        // wait for the requests for data
        await findAllByRole("treeitem");

        // simulate a user filtering the list of top level hierarchy values
        const filter1 = topLevelHierarchyValues[0];
        const filter2 = topLevelHierarchyValues[1];
        store.dispatch(
            selection.actions.addFileFilter(new FileFilter(fooAnnotation.name, filter1))
        );
        store.dispatch(
            selection.actions.addFileFilter(new FileFilter(fooAnnotation.name, filter2))
        );

        // after going through the store and an update cycle or two, the tree should be filtered
        // down to just the two annotation values selected
        await waitFor(async () => expect((await findAllByRole("treeitem")).length).to.equal(2));

        // the remainder top level items should should be gone from the DOM
        topLevelHierarchyValues.slice(2).forEach((value) => {
            expect(() => getByText(value)).to.throw();
        });

        // all of the files rendered underneath the first top-level folder should only have one value for their "foo" annotation
        fireEvent.click(await findByText(filter1));
        const nodes = await findAllByRole("treeitem");
        const fileListContainer = await findByRoleWithin(nodes[0], "group");
        await findAllByTextWithin(fileListContainer, filter1); // each foo annotation should be equal to `filter1`...
        expect(() => getByTextWithin(fileListContainer, `${filter1}, ${filter2}`)).to.throw(); // ..and NOT equal to "`filter1`, `filter2`"
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
