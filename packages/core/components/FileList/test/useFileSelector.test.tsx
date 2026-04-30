import { configureMockStore, mergeState } from "@aics/redux-utils";
import { act, render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import FileSelection from "../../../entity/FileSelection";
import FileSet from "../../../entity/FileSet";
import NumericRange from "../../../entity/NumericRange";
import { initialState, selection } from "../../../state";
import useFileSelector, { OnSelect } from "../useFileSelector";

// Minimal test component that exposes the onSelect callback via a ref.
function TestComponent(props: {
    fileSet: FileSet;
    sortOrder: number;
    onSelectRef: React.MutableRefObject<OnSelect | null>;
}) {
    const onSelect = useFileSelector(props.fileSet, props.sortOrder);
    // Keep the ref updated so test code can call the latest version
    props.onSelectRef.current = onSelect;
    return <div data-testid="test-component" />;
}

describe("useFileSelector", () => {
    const fileSet = new FileSet();
    const sortOrder = 0;

    it("uses the focused item index from Redux as the shift+click range boundary after arrow key navigation", async () => {
        // Arrange: simulate a file selection where the focused item is at index 5
        // (as would happen after navigating down with the arrow key)
        const arrowNavigatedIndex = 5;
        const fileSelection = new FileSelection().select({
            fileSet,
            index: arrowNavigatedIndex,
            sortOrder,
        });
        const state = mergeState(initialState, {
            selection: { fileSelection },
        });
        const { store, actions } = configureMockStore({ state });

        const onSelectRef = React.createRef<OnSelect | null>() as React.MutableRefObject<
            OnSelect | null
        >;

        render(
            <Provider store={store}>
                <TestComponent fileSet={fileSet} sortOrder={sortOrder} onSelectRef={onSelectRef} />
            </Provider>
        );

        // Wait for the effect that syncs lastSelectedFileIndex with the focused item to run
        await act(async () => {
            await Promise.resolve();
        });

        // Act: shift+click file at index 9 — the range should start from the arrow-navigated
        // index (5) and end at the shift-clicked index (9)
        const shiftClickedIndex = 9;
        await act(async () => {
            onSelectRef.current!(
                { index: shiftClickedIndex, id: "test-file" },
                { ctrlKeyIsPressed: false, shiftKeyIsPressed: true }
            );
        });

        // Assert: dispatched action should select the range [5, 9]
        expect(
            actions.includesMatch(
                selection.actions.selectFile({
                    fileSet,
                    lastTouched: shiftClickedIndex,
                    selection: new NumericRange(arrowNavigatedIndex, shiftClickedIndex),
                    sortOrder,
                    updateExistingSelection: true,
                })
            )
        ).to.be.true;
    });

    it("uses the clicked index as the shift+click range boundary when no prior selection exists", async () => {
        // Arrange: no prior file selection
        const { store, actions } = configureMockStore({ state: initialState });

        const onSelectRef = React.createRef<OnSelect | null>() as React.MutableRefObject<
            OnSelect | null
        >;

        render(
            <Provider store={store}>
                <TestComponent fileSet={fileSet} sortOrder={sortOrder} onSelectRef={onSelectRef} />
            </Provider>
        );

        await act(async () => {
            await Promise.resolve();
        });

        // Act: shift+click without any prior selection or navigation — falls back to the
        // clicked index as both boundary and selection
        const clickedIndex = 3;
        await act(async () => {
            onSelectRef.current!(
                { index: clickedIndex, id: "test-file" },
                { ctrlKeyIsPressed: false, shiftKeyIsPressed: true }
            );
        });

        // Assert: single-file "range" [3, 3]
        expect(
            actions.includesMatch(
                selection.actions.selectFile({
                    fileSet,
                    lastTouched: clickedIndex,
                    selection: new NumericRange(clickedIndex, clickedIndex),
                    sortOrder,
                    updateExistingSelection: true,
                })
            )
        ).to.be.true;
    });

    it("shift+click anchor does not move after a shift+click (consecutive shift+clicks share the same anchor)", async () => {
        // Arrange: simulate a prior regular click at index 2
        const anchorIndex = 2;
        const fileSelection = new FileSelection().select({
            fileSet,
            index: anchorIndex,
            sortOrder,
        });
        const state = mergeState(initialState, {
            selection: { fileSelection },
        });
        const { store, actions } = configureMockStore({ state });

        const onSelectRef = React.createRef<OnSelect | null>() as React.MutableRefObject<
            OnSelect | null
        >;

        render(
            <Provider store={store}>
                <TestComponent fileSet={fileSet} sortOrder={sortOrder} onSelectRef={onSelectRef} />
            </Provider>
        );

        await act(async () => {
            await Promise.resolve();
        });

        // First: regular click at index 2 to set the anchor
        await act(async () => {
            onSelectRef.current!(
                { index: anchorIndex, id: "test-file" },
                { ctrlKeyIsPressed: false, shiftKeyIsPressed: false }
            );
        });

        // Act: shift+click at index 7 — anchor should still be 2, selecting [2, 7]
        await act(async () => {
            onSelectRef.current!(
                { index: 7, id: "test-file-7" },
                { ctrlKeyIsPressed: false, shiftKeyIsPressed: true }
            );
        });

        // Assert range starts from the anchor (index 2), not the shift+clicked index
        expect(
            actions.includesMatch(
                selection.actions.selectFile({
                    fileSet,
                    lastTouched: 7,
                    selection: new NumericRange(anchorIndex, 7),
                    sortOrder,
                    updateExistingSelection: true,
                })
            )
        ).to.be.true;
    });
});
