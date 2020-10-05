import { configureMockStore, mergeState, createMockHttpClient, ResponseStub } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import { get as _get } from "lodash";
import React from "react";
import { Provider } from "react-redux";
import { Store, AnyAction } from "redux";
import { createSandbox, SinonSpy } from "sinon";

import useDirectoryHierarchy, { UseDirectoryHierarchyParams } from "../useDirectoryHierarchy";
import { State } from "../directory-hierarchy-state";
import FileFilter from "../../../entity/FileFilter";
import FileService from "../../../services/FileService";
import { initialState, interaction } from "../../../state";
import Annotation from "../../../entity/Annotation";

function useDirectoryHierarchyMock(
    store: Store<any, AnyAction>,
    params: UseDirectoryHierarchyParams
) {
    const returnVal: { isLeaf: boolean; state: State } | {} = {};
    function TestComponent() {
        Object.assign(returnVal, useDirectoryHierarchy(params));
        return null;
    }
    render(
        <Provider store={store}>
            <TestComponent />
        </Provider>
    );
    return returnVal;
}

describe("useDirectoryHierarchy", () => {
    describe("filtering user selected filters", () => {
        const baseUrl = "test";
        const cellLineAnnotation = new Annotation({
            annotationDisplayName: "Cell Line",
            annotationName: "Cell Line",
            description: "",
            type: "Text",
        });
        const responseStub: ResponseStub = {
            when: (config) => _get(config, "url", "").includes(FileService.BASE_FILE_COUNT_URL),
            respondWith: {
                data: { data: [42] },
            },
        };
        const mockHttpClient = createMockHttpClient(responseStub);
        const fileService = new FileService({
            baseUrl,
            httpClient: mockHttpClient,
        });
        const sandbox = createSandbox();
        let spiedFileQuery: SinonSpy<[string], Promise<number>>;

        beforeEach(() => {
            sandbox.stub(interaction.selectors, "getFileService").returns(fileService);
            spiedFileQuery = sandbox.spy(fileService, "getCountOfMatchingFiles");
        });

        afterEach(() => {
            sandbox.restore();
        });

        it("removes filters of annotations in the hierarchy when not root node", async () => {
            // Arrange
            const filters = [
                new FileFilter(cellLineAnnotation.name, "AICS-12"),
                new FileFilter("Notes", "Hello"),
            ];
            const state = mergeState(initialState, {
                interaction: {
                    fileExplorerServiceBaseUrl: baseUrl,
                },
                selection: {
                    annotationHierarchy: [cellLineAnnotation],
                    filters,
                },
            });
            const { store } = configureMockStore({
                state,
            });

            // Act
            useDirectoryHierarchyMock(store, { collapsed: false, currentNode: "AICS-7", sortOrder: 0 });

            // Assert
            expect(spiedFileQuery.called).to.be.true;
            expect(spiedFileQuery.callCount).to.be.eq(1);
            // Assert that the query string contains the expected filters after filtering
            expect(JSON.stringify(spiedFileQuery.firstCall.args[0])).to.be.eq(
                '"Cell Line=AICS-7&Notes=Hello"'
            );
        });

        it("removes duplicate filters", () => {
            // Arrange
            const filters = [
                new FileFilter(cellLineAnnotation.name, "AICS-12"),
                new FileFilter("Notes", "Hello"),
                new FileFilter(cellLineAnnotation.name, "AICS-12"),
                new FileFilter(cellLineAnnotation.name, "AICS-8"),
            ];
            const state = mergeState(initialState, {
                interaction: {
                    fileExplorerServiceBaseUrl: baseUrl,
                },
                selection: {
                    annotationHierarchy: [],
                    filters,
                },
            });
            const { store } = configureMockStore({
                state,
            });

            // Act
            useDirectoryHierarchyMock(store, { collapsed: false, sortOrder: 0 });

            // Assert
            expect(spiedFileQuery.called).to.be.true;
            expect(spiedFileQuery.callCount).to.be.eq(1);
            // Assert that the query string contains the expected filters after filtering
            expect(JSON.stringify(spiedFileQuery.firstCall.args[0])).to.be.eq(
                '"Cell Line=AICS-12&Cell Line=AICS-8&Notes=Hello"'
            );
        });
    });
});
