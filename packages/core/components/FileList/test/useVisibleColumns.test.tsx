import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import useVisibleColumns from "../useVisibleCells";
import HorizontalScrollContext from "../HorizontalScrollContext";
import { initialState } from "../../../state";
import { Column } from "../../../state/selection/actions";

/**
 * Test harness that renders the hook's output as data attributes for assertion.
 */
function MockHookedComponent() {
    const { columns, padding } = useVisibleColumns();
    return (
        <div
            data-testid="result"
            data-columns={JSON.stringify(columns.map((c) => c.name))}
            data-left={padding.left}
            data-right={padding.right}
        />
    );
}

function renderWithContext(columns: Column[], scrollLeft: number, containerWidth: number) {
    const state = mergeState(initialState, {
        selection: { columns },
    });
    const { store } = configureMockStore({ state });

    const { getByTestId } = render(
        <Provider store={store}>
            <HorizontalScrollContext.Provider value={{ scrollLeft, containerWidth }}>
                <MockHookedComponent />
            </HorizontalScrollContext.Provider>
        </Provider>
    );

    const el = getByTestId("result");
    return {
        columns: JSON.parse(el.getAttribute("data-columns") || "[]") as string[],
        left: Number(el.getAttribute("data-left")),
        right: Number(el.getAttribute("data-right")),
    };
}

describe("useVisibleColumns", () => {
    const columns: Column[] = [
        { name: ["A"], width: 200 },
        { name: ["B"], width: 3000 },
        { name: ["C"], width: 200 },
        { name: ["D"], width: 100 },
        { name: ["E"], width: 200 },
        { name: ["F"], width: 200 },
        { name: ["G"], width: 2 },
        { name: ["H"], width: 200 },
        { name: ["I"], width: 200 },
        { name: ["J"], width: 2000 },
    ];

    it("returns first N columns when containerWidth is 0 (not yet measured)", () => {
        const result = renderWithContext(columns, 0, 0);
        // Hook returns up to 6 columns when containerWidth is 0
        expect(result.columns).to.deep.equal(["A", "B", "C", "D", "E", "F"]);
        expect(result.left).to.equal(0);
        expect(result.right).to.equal(0);
    });

    it("returns only visible columns for a given scroll position", () => {
        // containerWidth=400 at scrollLeft=0 → viewStart=-200, viewEnd=600
        // A(0-200) visible, B(200-3200) extends past viewEnd so endIndex=2
        const result = renderWithContext(columns, 0, 400);
        expect(result.columns).to.deep.equal(["A", "B"]);
        expect(result.left).to.equal(0);
        // C(200)+D(100)+E(200)+F(200)+G(2)+H(200)+I(200)+J(2000) = 3102
        expect(result.right).to.equal(3102);
    });

    it("calculates correct left and right padding when scrolled to the middle", () => {
        // scrollLeft=400, containerWidth=400 → viewStart=200, viewEnd=1000
        // A(0-200): 200 > 200? No → skip. B(200-3200): 3200 > 200 → startIndex=1, leftPad=200
        // B is so wide (3000px) that cumulative reaches 3200 >= 1000 → endIndex=2
        const result = renderWithContext(columns, 400, 400);
        expect(result.left).to.equal(200);
        expect(result.columns).to.deep.equal(["B"]);
        // C through J = 3102
        expect(result.right).to.equal(3102);
    });

    it("returns all columns when total width fits within containerWidth + overscan", () => {
        // Total width = 6302. containerWidth must be large enough for viewEnd to exceed it.
        // containerWidth=6302 → viewEnd = 0 + 6302 + 200 = 6502 > 6302 → all visible
        const result = renderWithContext(columns, 0, 6302);
        expect(result.columns).to.deep.equal(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]);
        expect(result.left).to.equal(0);
        expect(result.right).to.equal(0);
    });

    it("handles columns with uneven widths", () => {
        const unevenColumns: Column[] = [
            { name: ["narrow"], width: 50 },
            { name: ["wide"], width: 500 },
            { name: ["medium"], width: 150 },
            { name: ["large"], width: 400 },
        ];
        // scrollLeft=100, containerWidth=300 → viewStart=-100, viewEnd=600
        // narrow(0-50): 50 > -100 → visible, leftPad=0
        // wide(50-550): cumulative=550, 550>=600? No
        // medium(550-700): cumulative=700, 700>=600? Yes → endIndex=3
        const result = renderWithContext(unevenColumns, 100, 300);
        expect(result.columns).to.deep.equal(["narrow", "wide", "medium"]);
        expect(result.left).to.equal(0);
        expect(result.right).to.equal(
            unevenColumns.find((c) => c.name.join(".") === "large")?.width
        );
    });
});
