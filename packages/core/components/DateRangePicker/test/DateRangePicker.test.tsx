import { render, fireEvent } from "@testing-library/react";
import { expect } from "chai";
import { noop } from "lodash";
import * as React from "react";
import sinon from "sinon";

import DateRangePicker from "..";
import FileFilter from "../../../entity/FileFilter";

describe("<DateRangePicker />", () => {
    it("renders inputs for start and end dates with selectable date pickers", () => {
        // Arrange
        const onSearch = sinon.spy();
        const { getAllByLabelText, getAllByRole, getByLabelText, getByRole } = render(
            <DateRangePicker onSearch={onSearch} onReset={noop} currentRange={undefined} />
        );

        // Should render both input fields
        expect(getAllByRole("combobox").length).to.equal(2);
        expect(getAllByLabelText(/start/).length).to.equal(1);
        expect(getAllByLabelText(/end/).length).to.equal(1);

        // Select a start date
        expect(onSearch.called).to.equal(false);
        fireEvent.click(getByLabelText(/start/));
        fireEvent.click(getByRole("button", { name: /^18,\s/ }));
        expect(onSearch.called).to.equal(true);

        // Reset spy to isolate assertions)
        onSearch.resetHistory();

        // Select an end date
        expect(onSearch.called).to.equal(false);
        fireEvent.click(getByLabelText(/end/));
        fireEvent.click(getByRole("button", { name: /^20,\s/ }));
        expect(onSearch.called).to.equal(true);
    });

    it("initializes to values passed through props if provided", () => {
        // Arrange
        const currentRange = new FileFilter(
            "date",
            `RANGE(2024-02-21T00:00:00.000Z,2024-03-21T00:00:00.000Z)`
        );
        const { getByText } = render(
            <DateRangePicker onSearch={noop} onReset={noop} currentRange={currentRange} />
        );

        expect(getByText("Wed Feb 21 2024")).to.exist;
        // We currently subtract a day to account for exclusive upper date range
        expect(getByText("Wed Mar 20 2024")).to.exist;
    });

    it("renders a 'Reset' button if given a callback", () => {
        // Arrange
        const onSearch = noop;
        const onReset = sinon.spy();

        // Act / Assert
        const { getByTestId } = render(
            <DateRangePicker onSearch={onSearch} onReset={onReset} currentRange={undefined} />
        );

        // Hit reset
        expect(onReset.called).to.equal(false);
        fireEvent.click(getByTestId("base-button-Reset"));
        expect(onReset.called).to.equal(true);
    });
});
