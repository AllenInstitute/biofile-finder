import {
    configureMockStore,
    createMockHttpClient,
    mergeState,
    ResponseStub,
} from "@aics/redux-utils";
import { expect } from "chai";
import { get as _get } from "lodash";
import * as React from "react";
import { render, waitForElement } from "@testing-library/react";
import { Provider } from "react-redux";
import { stub } from "sinon";

import DirectoryTree from "../";
import * as directoryTreeSelectors from "../selectors";
import Annotation from "../../../entity/Annotation";
import AnnotationService from "../../../services/AnnotationService";
import { initialState } from "../../../state";
import FileService from "../../../services/FileService";

describe("<DirectoryTree />", () => {
    it("renders the top level of the hierarchy", async () => {
        // shit-ton of setup
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
                when: (config) => _get(config, "url", "").includes(FileService.BASE_FILE_COUNT_URL),
                respondWith: {
                    data: { data: [42] },
                },
            },
        ];
        const mockHttpClient = createMockHttpClient(responseStubs);
        const annotationService = new AnnotationService({ baseUrl, httpClient: mockHttpClient });
        const fileService = new FileService({ baseUrl, httpClient: mockHttpClient });
        stub(directoryTreeSelectors, "getAnnotationService").returns(annotationService);
        stub(directoryTreeSelectors, "getFileService").returns(fileService);
        const { store } = configureMockStore({ state, responseStubs });

        const { getByText, getAllByRole } = render(
            <Provider store={store}>
                <DirectoryTree />
            </Provider>
        );

        // wait for the requests for data
        const directoryTreeNodes = await waitForElement(() => getAllByRole("Treeitem"));

        // expect the top level annotation values to be in the dom
        expect(directoryTreeNodes.length).to.equal(4);
        expectedTopLevelHierarchyValues.forEach((value) => {
            expect(getByText(value)).to.be.not.be.undefined;
        });
    });
});
