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

import DirectoryTreeNode from "../DirectoryTreeNode";
import * as directoryTreeSelectors from "../selectors";
import Annotation from "../../../entity/Annotation";
import AnnotationService from "../../../services/AnnotationService";
import { initialState } from "../../../state";
import FileService from "../../../services/FileService";

describe("<DirectoryTreeNode />", () => {
    const sandbox = createSandbox();

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

    const expectedThirdLevelHierarchyValues = [1, 2, 3, 4, 5];
    const responseStubs: ResponseStub[] = [
        {
            when: (config) => _get(config, "url", "").includes(FileService.BASE_FILE_IDS_URL),
            respondWith: {
                data: { data: ["abc123"] },
            },
        },
        {
            when: (config) => _get(config, "url", "").includes(FileService.BASE_FILES_URL),
            respondWith: {
                data: { data: [{ fileId: "abc123", annotations: [] }] },
            },
        },
        {
            when: (config) =>
                _get(config, "url", "").includes(
                    AnnotationService.BASE_ANNOTATION_HIERARCHY_UNDER_PATH_URL
                ),
            respondWith: {
                data: { data: expectedThirdLevelHierarchyValues },
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

    before(() => {
        sandbox.stub(directoryTreeSelectors, "getAnnotationService").returns(annotationService);
        sandbox.stub(directoryTreeSelectors, "getFileService").returns(fileService);
    });

    afterEach(() => {
        sandbox.resetHistory();
    });

    after(() => {
        sandbox.restore();
    });

    // TODO
    it.skip("presents a FileList on expansion if at the bottom of the annotation hierarchy", async () => {
        const { store } = configureMockStore({ state, responseStubs });

        const { getByText } = render(
            <Provider store={store}>
                <DirectoryTreeNode ancestorNodes={["foo", "bar"]} currentNode="baz" />
            </Provider>
        );

        const header = getByText("baz");

        fireEvent.click(header);

        await waitForElement(() => {
            getByText("abc123"); // fileId
        });
    });

    // TODO
    it.skip("presents another level of hierarchy if not at the bottom of the annotation hierarchy", () => {});
});
