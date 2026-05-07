import { configureMockStore, mergeState } from "@aics/redux-utils";
import { act, render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import useFileSelector, { OnSelect } from "../useFileSelector";
import FileSelection from "../../../entity/FileSelection";
import FileSet from "../../../entity/FileSet";
import NumericRange from "../../../entity/NumericRange";
import { initialState, selection } from "../../../state";

// Minimal test component that exposes the onSelect callback via a ref.
function TestComponent(props: {
    fileSet: FileSet;
    sortOrder: number;
    onSelectRef: React.MutableRefObject<OnSelect | null>;
}) {
    const onSelect = useFileSelector(props.fileSet, props.sortOrder);
    props.onSelectRef.current = onSelect;
    return <div data-testid="test-component" />;
}

describe("useFileSelector", () => {
    const fileSet = new FileSet();
    const sortOrder = 0;

    function selectFileAt(index: number) {
        return new FileSelection().select({ fileSet, index, sortOrder });
    }

    function renderWithState(fileSelection?: FileSelection) {
        const state = fileSelection
            ? mergeState(initialState, { selection: { fileSelection } })
            : initialState;
        const { store, actions } = configureMockStore({ state });
        const onSelectRef = React.createRef<OnSelect | null>() as React.MutableRefObject<OnSelect | null>;

        render(
            <Provider store={store}>
                <TestComponent fileSet={fileSet} sortOrder={sortOrder} onSelectRef={onSelectRef} />
            </Provider>
        );

        const click = (index: number, id = "test-file") =>
            act(async () => {
                onSelectRef.current?.(
                    { index, id },
                    { ctrlKeyIsPressed: false, shiftKeyIsPressed: false }
                );
            });

        const shiftClick = (index: number, id = "test-file") =>
            act(async () => {
                onSelectRef.current?.(
                    { index, id },
                    { ctrlKeyIsPressed: false, shiftKeyIsPressed: true }
                );
            });

        const flush = () => act(async () => void (await Promise.resolve()));

        return { actions, click, shiftClick, flush };
    }

    function expectRangeSelected(
        actions: ReturnType<typeof configureMockStore>["actions"],
        from: number,
        to: number
    ) {
        expect(
            actions.includesMatch(
                selection.actions.selectFile({
                    fileSet,
                    lastTouched: to,
                    selection: new NumericRange(Math.min(from, to), Math.max(from, to)),
                    sortOrder,
                    updateExistingSelection: true,
                })
            )
        ).to.be.true;
    }

    it("shift+click after arrow-key navigation selects from the focused row", async () => {
        const { actions, shiftClick, flush } = renderWithState(selectFileAt(5));
        await flush();

        await shiftClick(9);

        expectRangeSelected(actions, 5, 9);
    });

    it("shift+click with no prior selection selects only the clicked row", async () => {
        const { actions, shiftClick, flush } = renderWithState();
        await flush();

        await shiftClick(3);

        expectRangeSelected(actions, 3, 3);
    });

    it("consecutive shift+clicks keep the original fileset folder", async () => {
        const { actions, click, shiftClick, flush } = renderWithState(selectFileAt(2));
        await flush();

        await click(2);
        await shiftClick(7, "test-file-7");

        expectRangeSelected(actions, 2, 7);
    });
});
