import { render, fireEvent } from "@testing-library/react";
import { expect } from "chai";
import { noop } from "lodash";
import * as React from "react";
import sinon from "sinon";

import ListPicker, { ListItem } from "..";

describe("<ListPicker />", () => {
    it("renders a list of items that are selectable and deselectable", () => {
        // Arrange
        const onSelect = sinon.spy();
        const onDeselect = sinon.spy();
        const items: ListItem[] = ["foo", "bar"].map((val, idx) => ({
            selected: idx % 2 === 0,
            displayValue: val,
            value: val,
        }));

        // Act / Assert
        const { getByRole, getAllByRole } = render(
            <ListPicker
                items={items}
                onDeselect={onDeselect}
                onDeselectAll={noop}
                onSelect={onSelect}
            />
        );

        // Should render both list items
        expect(getAllByRole("checkbox").length).to.equal(2);

        // One should be checked, the other shouldn't be
        expect(getAllByRole("checkbox", { checked: false }).length).to.equal(1);
        expect(getAllByRole("checkbox", { checked: true }).length).to.equal(1);

        // Trigger selection for the item that isn't selected
        fireEvent.click(getByRole("checkbox", { checked: false }));
        expect(onDeselect.called).to.equal(false);
        expect(onSelect.called).to.equal(true);

        // Trigger deselect for the item that is selected
        // (reset spies first to isolate assertions)
        onDeselect.resetHistory();
        onSelect.resetHistory();
        fireEvent.click(getByRole("checkbox", { checked: true }));
        expect(onDeselect.called).to.equal(true);
        expect(onSelect.called).to.equal(false);
    });

    it("renders a search box that filters the rendered list items", () => {
        // Arrange
        const onSelect = noop;
        const onDeselect = noop;
        const items: ListItem[] = ["foo", "bar"].map((val, idx) => ({
            selected: idx % 2 === 0,
            displayValue: val,
            value: val,
        }));

        // Act / Assert
        const { getAllByRole, getByRole } = render(
            <ListPicker
                items={items}
                onDeselect={onDeselect}
                onDeselectAll={noop}
                onSelect={onSelect}
            />
        );

        // Should render both list items
        expect(getAllByRole("checkbox").length).to.equal(2);

        // Trigger a search
        fireEvent.change(getByRole("searchbox"), {
            target: {
                value: "foo",
            },
        });
        expect(getAllByRole("checkbox").length).to.equal(1);
    });

    it("Renders a 'Reset' button that deselects entire selection", () => {
        // Arrange
        const onSelect = noop;
        const onDeselect = noop;
        const onDeselectAll = sinon.spy();
        const items: ListItem[] = ["foo", "bar"].map((val) => ({
            selected: true, // start with all items selected
            displayValue: val,
            value: val,
        }));

        // Act / Assert
        const { getAllByRole, getByText } = render(
            <ListPicker
                items={items}
                onDeselect={onDeselect}
                onDeselectAll={onDeselectAll}
                onSelect={onSelect}
            />
        );

        // Should render both list items as initially selected
        expect(getAllByRole("checkbox", { checked: true }).length).to.equal(2);

        // Hit reset
        expect(onDeselectAll.called).to.equal(false);
        fireEvent.click(getByText("Reset"));
        expect(onDeselectAll.called).to.equal(true);
    });

    it("Renders a 'Select All' button if given a callback for selecting all items", () => {
        // Arrange
        const onSelectAll = sinon.spy();
        const items: ListItem[] = ["foo", "bar"].map((val) => ({
            selected: true, // start with all items selected
            displayValue: val,
            value: val,
        }));
        const { getAllByRole, getByText } = render(
            <ListPicker
                items={items}
                onDeselect={noop}
                onDeselectAll={noop}
                onSelectAll={onSelectAll}
                onSelect={noop}
            />
        );

        // (sanity-check)
        expect(getAllByRole("checkbox", { checked: true }).length).to.equal(2);
        expect(onSelectAll.called).to.be.false;

        // Act
        fireEvent.click(getByText("Select All"));

        // Assert
        expect(onSelectAll.called).to.be.true;
    });

    it("Displays count of items", () => {
        // Arrange
        const items: ListItem[] = ["foo", "bar"].map((val) => ({
            selected: true, // start with all items selected
            displayValue: val,
            value: val,
        }));
        const { getByText } = render(
            <ListPicker items={items} onDeselect={noop} onDeselectAll={noop} onSelect={noop} />
        );

        // Act / Assert
        expect(getByText(`Displaying ${items.length} of ${items.length} Options`)).to.exist;
    });
});
