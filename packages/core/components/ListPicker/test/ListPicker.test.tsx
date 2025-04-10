import { configureMockStore } from "@aics/redux-utils";
import { render, fireEvent } from "@testing-library/react";
import { expect } from "chai";
import { noop } from "lodash";
import * as React from "react";
import { Provider } from "react-redux";
import sinon from "sinon";

import ListPicker from "..";
import { ListItem } from "../ListRow";
import { initialState } from "../../../state";

describe("<ListPicker />", () => {
    const LISTROW_TESTID_PREFIX = "default-button-";
    it("renders a list of items that are selectable and deselectable", () => {
        // Arrange
        const onSelect = sinon.spy();
        const onDeselect = sinon.spy();
        const items: ListItem[] = ["foo", "bar"].map((val) => ({
            selected: val === "bar",
            displayValue: val,
            value: val,
        }));
        const { store } = configureMockStore({
            state: initialState,
        });

        // Act / Assert
        const { getAllByRole, getByTestId } = render(
            <Provider store={store}>
                <ListPicker
                    items={items}
                    onDeselect={onDeselect}
                    onDeselectAll={noop}
                    onSelect={onSelect}
                />
            </Provider>
        );

        // Should render both list items + a reset button
        expect(getAllByRole("button")).to.be.lengthOf(3);

        // Trigger selection for the item that isn't selected
        fireEvent.click(getByTestId(`${LISTROW_TESTID_PREFIX}foo`));
        expect(onDeselect.called).to.be.false;
        expect(onSelect.called).to.be.true;

        // Trigger deselect for the item that is selected
        // (reset spies first to isolate assertions)
        onDeselect.resetHistory();
        onSelect.resetHistory();
        fireEvent.click(getByTestId(`${LISTROW_TESTID_PREFIX}bar`));
        expect(onDeselect.called).to.be.true;
        expect(onSelect.called).to.be.false;
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
        const { store } = configureMockStore({
            state: initialState,
        });

        // Act / Assert
        const { getByTestId, getByRole } = render(
            <Provider store={store}>
                <ListPicker
                    items={items}
                    onDeselect={onDeselect}
                    onDeselectAll={noop}
                    onSelect={onSelect}
                />
            </Provider>
        );

        // Should render both list items
        expect(getByTestId(`${LISTROW_TESTID_PREFIX}foo`)).to.not.be.undefined;
        expect(getByTestId(`${LISTROW_TESTID_PREFIX}bar`)).to.not.be.undefined;

        // Trigger a search
        fireEvent.change(getByRole("searchbox"), {
            target: {
                value: "foo",
            },
        });
        expect(getByTestId(`${LISTROW_TESTID_PREFIX}foo`)).to.not.be.undefined;
        expect(() => getByTestId(`${LISTROW_TESTID_PREFIX}bar`)).to.throw();
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
        const { store } = configureMockStore({
            state: initialState,
        });

        // Act / Assert
        const { getByText } = render(
            <Provider store={store}>
                <ListPicker
                    items={items}
                    onDeselect={onDeselect}
                    onDeselectAll={onDeselectAll}
                    onSelect={onSelect}
                />
            </Provider>
        );

        // Hit reset
        expect(onDeselectAll.called).to.equal(false);
        fireEvent.click(getByText("Clear all"));
        expect(onDeselectAll.called).to.equal(true);
    });

    it("Unable to select 'Clear all' button if no items selected", () => {
        // Arrange
        const onSelect = noop;
        const onDeselect = noop;
        const onDeselectAll = sinon.spy();
        const items: ListItem[] = ["foo", "bar"].map((val) => ({
            selected: false, // start with all items unselected
            displayValue: val,
            value: val,
        }));
        const { store } = configureMockStore({
            state: initialState,
        });

        // Act / Assert
        const { getByText } = render(
            <Provider store={store}>
                <ListPicker
                    items={items}
                    onDeselect={onDeselect}
                    onDeselectAll={onDeselectAll}
                    onSelect={onSelect}
                />
            </Provider>
        );

        // Hit reset
        expect(onDeselectAll.called).to.be.false;
        fireEvent.click(getByText("Clear all"));
        expect(onDeselectAll.called).to.be.false;
    });

    it("Renders a 'Select All' button if given a callback for selecting all items", () => {
        // Arrange
        const onSelectAll = sinon.spy();
        const items: ListItem[] = ["foo", "bar"].map((val) => ({
            selected: false, // start with all items unselected
            displayValue: val,
            value: val,
        }));
        const { store } = configureMockStore({
            state: initialState,
        });
        const { getByText } = render(
            <Provider store={store}>
                <ListPicker
                    items={items}
                    onDeselect={noop}
                    onDeselectAll={noop}
                    onSelectAll={onSelectAll}
                    onSelect={noop}
                />
            </Provider>
        );

        // (sanity-check)
        expect(onSelectAll.called).to.be.false;

        // Act
        fireEvent.click(getByText("Select all"));

        // Assert
        expect(onSelectAll.called).to.be.true;
    });

    it("Unable to select 'Select all' button if all items selected", () => {
        // Arrange
        const onSelectAll = sinon.spy();
        const items: ListItem[] = ["foo", "bar"].map((val) => ({
            selected: true, // start with all items selected
            displayValue: val,
            value: val,
        }));
        const { store } = configureMockStore({
            state: initialState,
        });
        const { getByText } = render(
            <Provider store={store}>
                <ListPicker
                    items={items}
                    onDeselect={noop}
                    onDeselectAll={noop}
                    onSelectAll={onSelectAll}
                    onSelect={noop}
                />
            </Provider>
        );

        // (sanity-check)
        expect(onSelectAll.called).to.be.false;

        // Act
        fireEvent.click(getByText("Select all"));

        // Assert
        expect(onSelectAll.called).to.be.false;
    });

    it("Displays count of items", () => {
        // Arrange
        const items: ListItem[] = ["foo", "bar"].map((val) => ({
            selected: true, // start with all items selected
            displayValue: val,
            value: val,
        }));
        const { store } = configureMockStore({
            state: initialState,
        });
        const { getByText } = render(
            <Provider store={store}>
                <ListPicker items={items} onDeselect={noop} onDeselectAll={noop} onSelect={noop} />
            </Provider>
        );

        // Act / Assert
        expect(getByText(`Displaying ${items.length} of ${items.length} Options`)).to.exist;
    });
});
