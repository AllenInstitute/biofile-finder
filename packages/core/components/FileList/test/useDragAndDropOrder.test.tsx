import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import * as sinon from "sinon";

import useDragAndDropOrder from "../useDragAndDropOrder";

/**
 * Minimal test harness that wires the hook to a set of draggable, focusable divs.
 * Each div exposes the current hook state via data-attributes so tests can
 * assert on visual-feedback values without reaching into React internals.
 */
function DraggableList({
    items,
    onReorder,
}: {
    items: string[];
    onReorder: (newOrder: string[]) => void;
}) {
    const {
        draggedItem,
        dragOverItem,
        keyboardSelectedItem,
        onDragStart,
        onDragOver,
        onDrop,
        onDragEnd,
        onKeyDown,
    } = useDragAndDropOrder(items, onReorder);

    return (
        <div>
            {items.map((item) => (
                <div
                    key={item}
                    data-testid={item}
                    data-is-dragged={String(draggedItem === item)}
                    data-is-drag-over={String(dragOverItem === item)}
                    data-is-keyboard-selected={String(keyboardSelectedItem === item)}
                    draggable
                    tabIndex={0}
                    onDragStart={() => onDragStart(item)}
                    onDragOver={(e) => onDragOver(e, item)}
                    onDrop={() => onDrop(item)}
                    onDragEnd={onDragEnd}
                    onKeyDown={(e) => onKeyDown(e, item)}
                >
                    {item}
                </div>
            ))}
        </div>
    );
}

describe("useDragAndDropOrder", () => {
    // ── helpers ──────────────────────────────────────────────────────────────

    function renderList(items: string[], onReorder: sinon.SinonSpy) {
        return render(<DraggableList items={items} onReorder={onReorder} />);
    }

    // ── mouse drag-and-drop ───────────────────────────────────────────────────

    describe("mouse drag-and-drop", () => {
        it("reorders items by moving the dragged item to the drop target's position", () => {
            // Start: [a, b, c]  →  drag "c" onto "a"  →  expect [c, a, b]
            const onReorder = sinon.spy();
            const { getByTestId } = renderList(["a", "b", "c"], onReorder);

            fireEvent.dragStart(getByTestId("c"));
            fireEvent.dragOver(getByTestId("a"));
            fireEvent.drop(getByTestId("a"));

            expect(onReorder.calledOnceWith(["c", "a", "b"])).to.be.true;
        });

        it("does not call onReorder when an item is dropped onto itself", () => {
            const onReorder = sinon.spy();
            const { getByTestId } = renderList(["a", "b", "c"], onReorder);

            fireEvent.dragStart(getByTestId("b"));
            fireEvent.dragOver(getByTestId("b"));
            fireEvent.drop(getByTestId("b"));

            expect(onReorder.called).to.be.false;
        });

        it("marks the source item as dragged while a drag is in progress", () => {
            const { getByTestId } = renderList(["a", "b", "c"], sinon.spy());

            fireEvent.dragStart(getByTestId("b"));

            expect(getByTestId("b").dataset.isDragged).to.equal("true");
            expect(getByTestId("a").dataset.isDragged).to.equal("false");
        });

        it("marks the current drop target while dragging over it", () => {
            const { getByTestId } = renderList(["a", "b", "c"], sinon.spy());

            fireEvent.dragStart(getByTestId("c"));
            fireEvent.dragOver(getByTestId("a"));

            expect(getByTestId("a").dataset.isDragOver).to.equal("true");
            expect(getByTestId("b").dataset.isDragOver).to.equal("false");
        });

        it("clears all drag state after a successful drop", () => {
            const { getByTestId } = renderList(["a", "b", "c"], sinon.spy());

            fireEvent.dragStart(getByTestId("c"));
            fireEvent.dragOver(getByTestId("a"));
            fireEvent.drop(getByTestId("a"));

            expect(getByTestId("c").dataset.isDragged).to.equal("false");
            expect(getByTestId("a").dataset.isDragOver).to.equal("false");
        });

        it("clears all drag state when the drag is cancelled (dragEnd without drop)", () => {
            const { getByTestId } = renderList(["a", "b", "c"], sinon.spy());

            fireEvent.dragStart(getByTestId("c"));
            fireEvent.dragOver(getByTestId("a"));
            fireEvent.dragEnd(getByTestId("c"));

            expect(getByTestId("c").dataset.isDragged).to.equal("false");
            expect(getByTestId("a").dataset.isDragOver).to.equal("false");
        });
    });

    // ── keyboard reordering ───────────────────────────────────────────────────

    describe("keyboard reordering", () => {
        it("selects an item when Space is pressed on it", () => {
            const { getByTestId } = renderList(["a", "b", "c"], sinon.spy());

            fireEvent.keyDown(getByTestId("b"), { key: " " });

            expect(getByTestId("b").dataset.isKeyboardSelected).to.equal("true");
        });

        it("also selects an item when Enter is pressed on it", () => {
            const { getByTestId } = renderList(["a", "b", "c"], sinon.spy());

            fireEvent.keyDown(getByTestId("b"), { key: "Enter" });

            expect(getByTestId("b").dataset.isKeyboardSelected).to.equal("true");
        });

        it("deselects the item when Space is pressed a second time on the same item", () => {
            const { getByTestId } = renderList(["a", "b", "c"], sinon.spy());

            fireEvent.keyDown(getByTestId("b"), { key: " " });
            fireEvent.keyDown(getByTestId("b"), { key: " " });

            expect(getByTestId("b").dataset.isKeyboardSelected).to.equal("false");
        });

        it("moves the selected item one position to the right with ArrowRight", () => {
            // Start: [a, b, c]  →  select "a", press →  →  expect [b, a, c]
            const onReorder = sinon.spy();
            const { getByTestId } = renderList(["a", "b", "c"], onReorder);

            fireEvent.keyDown(getByTestId("a"), { key: " " });
            fireEvent.keyDown(getByTestId("a"), { key: "ArrowRight" });

            expect(onReorder.calledOnceWith(["b", "a", "c"])).to.be.true;
        });

        it("moves the selected item one position to the left with ArrowLeft", () => {
            // Start: [a, b, c]  →  select "c", press ←  →  expect [a, c, b]
            const onReorder = sinon.spy();
            const { getByTestId } = renderList(["a", "b", "c"], onReorder);

            fireEvent.keyDown(getByTestId("c"), { key: " " });
            fireEvent.keyDown(getByTestId("c"), { key: "ArrowLeft" });

            expect(onReorder.calledOnceWith(["a", "c", "b"])).to.be.true;
        });

        it("does not move an item past the first position when ArrowLeft is pressed at index 0", () => {
            const onReorder = sinon.spy();
            const { getByTestId } = renderList(["a", "b", "c"], onReorder);

            fireEvent.keyDown(getByTestId("a"), { key: " " });
            fireEvent.keyDown(getByTestId("a"), { key: "ArrowLeft" });

            expect(onReorder.called).to.be.false;
        });

        it("does not move an item past the last position when ArrowRight is pressed at the last index", () => {
            const onReorder = sinon.spy();
            const { getByTestId } = renderList(["a", "b", "c"], onReorder);

            fireEvent.keyDown(getByTestId("c"), { key: " " });
            fireEvent.keyDown(getByTestId("c"), { key: "ArrowRight" });

            expect(onReorder.called).to.be.false;
        });

        it("cancels keyboard selection when Escape is pressed", () => {
            const { getByTestId } = renderList(["a", "b", "c"], sinon.spy());

            fireEvent.keyDown(getByTestId("b"), { key: " " });
            fireEvent.keyDown(getByTestId("b"), { key: "Escape" });

            expect(getByTestId("b").dataset.isKeyboardSelected).to.equal("false");
        });

        it("ignores arrow keys when no item is currently selected", () => {
            const onReorder = sinon.spy();
            const { getByTestId } = renderList(["a", "b", "c"], onReorder);

            fireEvent.keyDown(getByTestId("a"), { key: "ArrowRight" });
            fireEvent.keyDown(getByTestId("b"), { key: "ArrowLeft" });

            expect(onReorder.called).to.be.false;
        });
    });
});
