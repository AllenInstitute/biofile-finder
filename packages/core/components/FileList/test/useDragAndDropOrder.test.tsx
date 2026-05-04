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
        onDragStart,
        onDragOver,
        onDrop,
        onDragEnd,
    } = useDragAndDropOrder(items, onReorder);

    return (
        <div>
            {items.map((item) => (
                <div
                    key={item}
                    data-testid={item}
                    data-is-dragged={String(draggedItem === item)}
                    data-is-drag-over={String(dragOverItem === item)}
                    draggable
                    tabIndex={0}
                    onDragStart={() => onDragStart(item)}
                    onDragOver={(e) => onDragOver(e, item)}
                    onDrop={() => onDrop(item)}
                    onDragEnd={onDragEnd}
                >
                    {item}
                </div>
            ))}
        </div>
    );
}

describe("useDragAndDropOrder", () => {
    function renderList(items: string[], onReorder: sinon.SinonSpy) {
        return render(<DraggableList items={items} onReorder={onReorder} />);
    }

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
