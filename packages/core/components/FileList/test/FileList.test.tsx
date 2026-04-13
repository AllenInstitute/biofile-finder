import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import { noop } from "lodash";
import * as React from "react";
import { Provider } from "react-redux";
import { createSandbox } from "sinon";

import FileSet from "../../../entity/FileSet";
import { initialState, metadata, reduxLogics, reducer } from "../../../state";
import HttpFileService from "../../../services/FileService/HttpFileService";

import FileList from "..";

describe("<FileList />", () => {
    it("Calls getCountOfMatchingFiles() on mount and properly updates state afterwards", async () => {
        const state = mergeState(initialState, { metadata: { annotationsLoaded: true } });
        const { store } = configureMockStore({ state });

        const sandbox = createSandbox();
        const fileService = new HttpFileService();
        sandbox.replace(fileService, "getCountOfMatchingFiles", () => Promise.resolve(999));
        const fileSet = new FileSet({ fileService });

        const { findByText, queryByText } = render(
            <Provider store={store}>
                <FileList fileSet={fileSet} isRoot={false} sortOrder={4} dispatch={noop} />
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
        const state = mergeState(initialState, { metadata: { annotationsLoaded: true } });
        const { store } = configureMockStore({ state });

        const sandbox = createSandbox();
        const fileService = new HttpFileService();
        sandbox.replace(fileService, "getCountOfMatchingFiles", () => Promise.resolve(0));
        const fileSet = new FileSet({ fileService });

        const { findByText, queryByText } = render(
            <Provider store={store}>
                <FileList fileSet={fileSet} isRoot={false} sortOrder={4} dispatch={noop} />
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

    it("waits for annotations to load before fetching files", async () => {
        // arrange
        const state = mergeState(initialState, {
            metadata: { annotationsLoaded: false },
        });
        const { store, logicMiddleware } = configureMockStore({
            state,
            reducer,
            logics: reduxLogics,
        });
        const sandbox = createSandbox();
        const getCountSpy = sandbox.spy();
        const fileService = new HttpFileService();
        sandbox.replace(fileService, "getCountOfMatchingFiles", () => {
            getCountSpy();
            return Promise.resolve(0);
        });
        const fileSet = new FileSet({ fileService });

        const { getByText } = render(
            <Provider store={store}>
                <FileList fileSet={fileSet} isRoot={false} sortOrder={4} dispatch={noop} />
            </Provider>
        );

        // pre-check
        expect(getCountSpy.called).to.equal(false);
        expect(() => getByText("Counting files...")).not.to.throw();

        // act
        store.dispatch(metadata.actions.receiveAnnotations([]));
        await logicMiddleware.whenComplete();

        // assert
        expect(getCountSpy.called).to.equal(true);
        expect(() => getByText("Counting files...")).to.throw;
    });
});
