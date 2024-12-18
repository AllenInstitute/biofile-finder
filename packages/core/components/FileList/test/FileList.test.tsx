import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";
import { createSandbox } from "sinon";

import FileSet from "../../../entity/FileSet";
import { initialState } from "../../../state";
import HttpFileService from "../../../services/FileService/HttpFileService";

import FileList from "..";

describe("<FileList />", () => {
    it("Calls getCountOfMatchingFiles() on mount and properly updates state afterwards", async () => {
        const state = mergeState(initialState, {});
        const { store } = configureMockStore({ state });

        const sandbox = createSandbox();
        const fileService = new HttpFileService();
        sandbox.replace(fileService, "getCountOfMatchingFiles", () => Promise.resolve(999));
        const fileSet = new FileSet({ fileService });

        const { findByText, queryByText } = render(
            <Provider store={store}>
                <FileList fileSet={fileSet} isRoot={false} sortOrder={4} />
            </Provider>
        );

        // This should be present on the initial render and get replaced when the query returns
        expect(queryByText("Counting files...")).to.exist;

        // Wait for the fileService call to return, then check for updated list length display
        await findByText("999 files");
        expect(queryByText("Counting files...")).to.not.exist;
    });

    it("displays 'No files match your query' when no files found", async () => {
        // Arrange
        const { store } = configureMockStore({ state: initialState });

        const sandbox = createSandbox();
        const fileService = new HttpFileService();
        sandbox.replace(fileService, "getCountOfMatchingFiles", () => Promise.resolve(0));
        const fileSet = new FileSet({ fileService });

        const { findByText, queryByText } = render(
            <Provider store={store}>
                <FileList fileSet={fileSet} isRoot={false} sortOrder={4} />
            </Provider>
        );

        // Act
        // This should be present on the initial render and get replaced when the query returns
        expect(queryByText("Counting files...")).to.exist;

        // Wait for the fileService call to return, then check for updated list length display
        await findByText("No files match your query");

        // Assert
        expect(queryByText("Counting files...")).to.not.exist;
    });
});
