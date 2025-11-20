import { configureMockStore, mergeState } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import React from "react";
import { Provider } from "react-redux";
import { createSandbox } from "sinon";

import FileSelection, { FocusDirective } from "../../../entity/FileSelection";
import FileSet from "../../../entity/FileSet";
import NumericRange from "../../../entity/NumericRange";
import { SelectionAggregationResult } from "../../../services/FileService";
import FileServiceNoop from "../../../services/FileService/FileServiceNoop";
import { initialState, interaction, selection } from "../../../state";

import styles from "../Pagination.module.css";

import Pagination from "../Pagination";

describe("<Pagination />", () => {
    const sandbox = createSandbox();

    afterEach(() => {
        sandbox.restore();
    });

    class MockFileService extends FileServiceNoop {
        public async getAggregateInformation(): Promise<SelectionAggregationResult> {
            return { size: 1, count: 1 };
        }
    }
    const mockFileService = new MockFileService();

    it("should be hidden when only one file is selected", async () => {
        // Arrange
        sandbox.stub(interaction.selectors, "getFileService").returns(mockFileService);
        const fileSelection = new FileSelection([]).select({
            fileSet: new FileSet(),
            index: 0, // Only select one file
            sortOrder: 0,
        });
        const { store } = configureMockStore({
            state: mergeState(initialState, {
                selection: {
                    fileSelection,
                },
            }),
        });

        // Act
        const { getByTestId } = render(
            <Provider store={store}>
                <Pagination />
            </Provider>
        );

        // Assert
        const root = getByTestId("pagination-root");
        expect(root.classList.contains(styles.hidden)).to.be.true;
    });

    it("displays file count and selected index", async () => {
        // Arrange
        sandbox.stub(interaction.selectors, "getFileService").returns(mockFileService);
        const fileSelection = new FileSelection([]).select({
            fileSet: new FileSet(),
            index: new NumericRange(0, 4),
            indexToFocus: 3,
            sortOrder: 0,
        });
        const { store } = configureMockStore({
            state: mergeState(initialState, {
                selection: {
                    fileSelection,
                },
            }),
        });

        // Act
        const { getByTestId, getByText } = render(
            <Provider store={store}>
                <Pagination />
            </Provider>
        );

        // Assert
        // evergreen check
        const root = getByTestId("pagination-root");
        expect(root.classList.contains(styles.hidden)).to.be.false;

        expect(getByText(/4\/5/)).to.exist;
    });

    it("cycles to the first index when at end of list", async () => {
        // Arrange
        sandbox.stub(interaction.selectors, "getFileService").returns(mockFileService);
        const fileSelection = new FileSelection([]).select({
            fileSet: new FileSet(),
            index: new NumericRange(0, 4),
            indexToFocus: 4,
            sortOrder: 0,
        });
        const { store, actions, logicMiddleware } = configureMockStore({
            state: mergeState(initialState, {
                selection: {
                    fileSelection,
                },
            }),
        });

        // Act
        const { getAllByText, getByText } = render(
            <Provider store={store}>
                <Pagination />
            </Provider>
        );
        expect(getByText(/5\/5/)).to.exist; // At end of selection
        const nextButton = getAllByText(/View next/)
            .at(0)
            ?.closest("button");
        if (nextButton) {
            fireEvent.click(nextButton);
        }
        await logicMiddleware.whenComplete();

        // Assert
        expect(
            actions.includesMatch(
                selection.actions.setFileSelection(fileSelection.focus(FocusDirective.FIRST))
            )
        ).to.be.true;
    });

    it("cycles backwards to the last index when at beginning of list", async () => {
        // Arrange
        sandbox.stub(interaction.selectors, "getFileService").returns(mockFileService);
        const fileSelection = new FileSelection([]).select({
            fileSet: new FileSet(),
            index: new NumericRange(0, 4),
            indexToFocus: 0, // At beginning of selection
            sortOrder: 0,
        });
        const { store, actions, logicMiddleware } = configureMockStore({
            state: mergeState(initialState, {
                selection: {
                    fileSelection,
                },
            }),
        });

        // Act
        const { getAllByText, getByText } = render(
            <Provider store={store}>
                <Pagination />
            </Provider>
        );
        expect(getByText(/1\/5/)).to.exist; // At end of selection
        const nextButton = getAllByText(/View previous/)
            .at(0)
            ?.closest("button");
        if (nextButton) {
            fireEvent.click(nextButton);
        }
        await logicMiddleware.whenComplete();

        // Assert
        expect(
            actions.includesMatch(
                selection.actions.setFileSelection(fileSelection.focus(FocusDirective.LAST))
            )
        ).to.be.true;
    });
});
