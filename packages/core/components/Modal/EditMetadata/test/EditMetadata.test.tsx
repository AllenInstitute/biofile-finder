import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";
import { createSandbox } from "sinon";

import Modal, { ModalType } from "../..";
import { initialState } from "../../../../state";
import { AICS_FMS_DATA_SOURCE_NAME } from "../../../../constants";
import * as useFilteredSelection from "../../../../hooks/useFilteredSelection";
import FileSelection from "../../../../entity/FileSelection";
import FileSet from "../../../../entity/FileSet";
import NumericRange from "../../../../entity/NumericRange";

describe("<EditMetadata />", () => {
    const visibleDialogState = mergeState(initialState, {
        interaction: {
            visibleModal: ModalType.EditMetadata,
        },
        metadata: {
            passwordToProgramMap: {
                mockPassword: "Fake Program",
            },
        },
    });
    const sandbox = createSandbox();
    afterEach(() => {
        sandbox.restore();
    });

    it("shows password prompt when querying AICS", async () => {
        // Arrange
        const state = mergeState(visibleDialogState, {
            selection: {
                dataSources: [{ name: AICS_FMS_DATA_SOURCE_NAME }],
            },
        });
        const { store, logicMiddleware } = configureMockStore({ state });
        const { getByText } = render(
            <Provider store={store}>
                <Modal />
            </Provider>
        );
        // Act: wait for passwords to load
        await logicMiddleware.whenComplete();

        // Assert
        expect(getByText("Password")).to.exist;
        expect(getByText(/A password is required/)).to.exist;
    });

    it("skips password step for non AICS data source", async () => {
        // Arrange
        const state = mergeState(visibleDialogState, {
            selection: {
                dataSources: [{ name: "Mock Data Source" }],
            },
        });
        const { store, logicMiddleware } = configureMockStore({ state });
        const { getByText } = render(
            <Provider store={store}>
                <Modal />
            </Provider>
        );
        // Act: Don't need to wait for passwords,
        // but keeping for consistency with previous test
        await logicMiddleware.whenComplete();

        // Assert
        // Make sure loading is complete
        expect(getByText("Existing field")).to.exist;
        expect(() => getByText("Password")).to.throw;
    });

    it("shows a count of selected files", () => {
        const totalFileCount = 123;
        const mockFileSelection = new FileSelection().select({
            fileSet: new FileSet(),
            index: new NumericRange(0, totalFileCount - 1),
            sortOrder: 0,
        });
        sandbox.stub(useFilteredSelection, "default").returns(mockFileSelection);
        const { store } = configureMockStore({ state: visibleDialogState });
        const { getByText } = render(
            <Provider store={store}>
                <Modal />
            </Provider>
        );
        expect(getByText(`Edit metadata (${totalFileCount} files)`)).to.exist;
    });

    it("hides deletion functionality when not in use", async () => {
        const state = mergeState(visibleDialogState, {
            selection: {
                dataSources: [{ name: "Mock Data Source" }],
            },
        });
        const { store, logicMiddleware } = configureMockStore({ state });
        const { getByText } = render(
            <Provider store={store}>
                <Modal />
            </Provider>
        );
        await logicMiddleware.whenComplete();
        expect(() => getByText(/You are deleting metadata/)).to.throw;
    });
});
