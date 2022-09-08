import FileList from "../index";
import { render } from "@testing-library/react";
import * as React from "react";
import FileSet from "../../../entity/FileSet";
import { expect } from "chai";
import { Provider } from "react-redux";
import { configureMockStore, mergeState } from "@aics/redux-utils";
import { initialState } from "../../../state";
import FileService from "../../../services/FileService";
import { createSandbox } from "sinon";

describe("<FileList />", () => {
    it("Renders 'Loading files...' when files have not yet loaded", async () => {
        const state = mergeState(initialState, {});
        const { store } = configureMockStore({ state });

        const sandbox = createSandbox();
        const fileService = new FileService();
        sandbox.replace(fileService, "getCountOfMatchingFiles", () => Promise.resolve(999));
        const fileSet = new FileSet({ fileService });

        const { findByText, queryByText } = render(
            <Provider store={store}>
                <FileList fileSet={fileSet} isRoot={false} sortOrder={4} />
            </Provider>
        );

        // This should be present on the initial render and disappear once the file info comes in
        expect(queryByText("Counting files...")).to.exist;

        // Wait for the fileService call to return, then check for updated list length display
        await findByText("999 files");
        expect(queryByText("Counting files...")).to.not.exist;
    });
});
