import FileList from "../index";
import { render } from "@testing-library/react";
import * as React from "react";
import FileSet from "../../../entity/FileSet";
import { expect } from "chai";
import { Provider } from "react-redux";
import { configureMockStore, mergeState } from "@aics/redux-utils";
import { initialState } from "../../../state";
import RestServiceResponse from "../../../entity/RestServiceResponse";
import FileService, { FmsFile } from "../../../services/FileService";
import { createSandbox } from "sinon";

describe("<FileList />", () => {
    it("Renders 'Loading files...' when files have not yet loaded", async () => {
        const state = mergeState(initialState, {});
        const { store } = configureMockStore({ state });

        const file: FmsFile = {
            file_id: "TestFileId",
            file_name: "TestFileName",
            file_path: `/TestFileName.file`,
            file_size: 1000,
            annotations: [],
            uploaded: "Sat Jan 01 00:00:000 GMT 2022",
        };
        const sandbox = createSandbox();
        const fileService = new FileService();
        sandbox.replace(fileService, "getFiles", () =>
            Promise.resolve(
                new RestServiceResponse({
                    data: [file, file],
                    hasMore: false,
                    offset: 0,
                    responseType: "SUCCESS",
                    // The rest of this response doesn't matter for this test, we just need the totalCount
                    totalCount: 2,
                })
            )
        );
        const fileSet = new FileSet({ fileService });

        const { findByText, queryByText } = render(
            <Provider store={store}>
                <FileList fileSet={fileSet} isRoot={false} sortOrder={4} />
            </Provider>
        );

        // This should be present on the initial render and disappear once the file info comes in
        expect(queryByText("Loading files...")).to.exist;

        // Wait for the fileService call to return, then check for updated list length display
        await findByText("2 files");
        expect(queryByText("Loading files...")).to.not.exist;
    });
});
