import {
    configureMockStore,
    createMockHttpClient,
    mergeState,
    ResponseStub,
} from "@aics/redux-utils";
import { expect } from "chai";
import { get as _get } from "lodash";
import * as React from "react";
import { fireEvent, render, waitForElement } from "@testing-library/react";
import { Provider } from "react-redux";
import { createSandbox } from "sinon";

import DirectoryTree from "../";
import * as directoryTreeSelectors from "../selectors";
import Annotation from "../../../entity/Annotation";
import AnnotationService from "../../../services/AnnotationService";
import { initialState } from "../../../state";
import FileService from "../../../services/FileService";

describe("<DirectoryTree />", () => {
    const sandbox = createSandbox();

    afterEach(() => {
        sandbox.resetHistory();
    });

    // SO MUCH SETUP
    const annotations = [
        new Annotation({
            annotationDisplayName: "Foo",
            annotationName: "foo",
            description: "",
            type: "Text",
            values: [],
        }),
        new Annotation({
            annotationDisplayName: "Bar",
            annotationName: "bar",
            description: "",
            type: "Text",
            values: [],
        }),
        new Annotation({
            annotationDisplayName: "Baz",
            annotationName: "baz",
            description: "",
            type: "Text",
            values: [],
        }),
    ];
    const baseUrl = "test";
    const state = mergeState(initialState, {
        interaction: {
            fileExplorerServiceBaseUrl: baseUrl,
        },
        selection: {
            annotationHierarchy: annotations,
        },
    });

    const expectedTopLevelHierarchyValues = ["first", "second", "third", "fourth"];
    const expectedSecondLevelHierarchyValues = ["a", "b", "c"];
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
    ];
    const mockHttpClient = createMockHttpClient(responseStubs);
    const annotationService = new AnnotationService({ baseUrl, httpClient: mockHttpClient });
    const fileService = new FileService({ baseUrl, httpClient: mockHttpClient });
    sandbox.stub(directoryTreeSelectors, "getAnnotationService").returns(annotationService);
    sandbox.stub(directoryTreeSelectors, "getFileService").returns(fileService);

    it("renders the top level of the hierarchy", async () => {
        const { store } = configureMockStore({ state, responseStubs });

        const { getByText, getAllByRole } = render(
            <Provider store={store}>
                <DirectoryTree />
            </Provider>
        );

        // wait for the requests for data
        const directoryTreeNodes = await waitForElement(() => getAllByRole("treeitem"));

        // expect the top level annotation values to be in the dom
        expect(directoryTreeNodes.length).to.equal(4);
        expectedTopLevelHierarchyValues.forEach((value) => {
            expect(getByText(value)).to.exist.and.to.be.instanceOf(HTMLElement);
        });
    });

    it("collapses and expands sub-levels of the annotation hierarchy", async () => {
        const { store } = configureMockStore({ state, responseStubs });

        const { getByText } = render(
            <Provider store={store}>
                <DirectoryTree />
            </Provider>
        );

        // wait for the requests for annotation values at the top level of the hierarchy
        const topLevelValue = await waitForElement(() =>
            getByText(expectedTopLevelHierarchyValues[0])
        );

        // click on the tree item
        fireEvent.click(topLevelValue);

        // it's children should appear
        await waitForElement(() => getByText(expectedSecondLevelHierarchyValues[2]));

        // click the tree item again and its children should disappear
        fireEvent.click(topLevelValue);

        // getByText will throw if it can't find the element
        expect(() => getByText(expectedSecondLevelHierarchyValues[2])).to.throw();
    });
});
