import { render, fireEvent } from "@testing-library/react";
import { expect } from "chai";
import { noop } from "lodash";
import * as React from "react";
import sinon from "sinon";

import { AnnotationType } from "../../../entity/AnnotationFormatter";
import FileFilter from "../../../entity/FileFilter";

import DateRangePicker from "..";

describe("<DateRangePicker />", () => {
    it("renders inputs for start and end dates with selectable date pickers", () => {
        // Arrange
        const onSearch = sinon.spy();
        const { getAllByText, getAllByRole, getByRole, getByText } = render(
            <DateRangePicker onSearch={onSearch} onReset={noop} currentRange={undefined} />
        );

        // Should render both input fields
        expect(getAllByRole("combobox").length).to.equal(2);
        expect(getAllByText(/Start/).length).to.equal(1);
        expect(getAllByText(/End/).length).to.equal(1);

        // Select a start date
        expect(onSearch.called).to.equal(false);
        fireEvent.click(getByText(/Start/));
        fireEvent.click(getByRole("button", { name: /^18,\s/ }));
        expect(onSearch.called).to.equal(true);

        // Reset spy to isolate assertions)
        onSearch.resetHistory();

        // Select an end date
        expect(onSearch.called).to.equal(false);
        fireEvent.click(getByText(/End/));
        fireEvent.click(getByRole("button", { name: /^20,\s/ }));
        expect(onSearch.called).to.equal(true);
    });

    // These tests can be manually run in different timezones by changing package.json to
    // `"test:core": "cd packages/core && BABEL_ENV=nodejs TZ='America/Los_Angeles' mocha --exit",`
    // where TZ is the timezone you want to test
    describe("Date rendering at different ISO times", () => {
        const sandbox = sinon.createSandbox();
        afterEach(() => {
            sandbox.restore();
        });

        const startDate = "2025-05-23";
        const endDate = "2025-06-03";
        const times = ["T00:00:00.000Z", "T12:00:00.000Z", "T23:00:00.000Z"];

        times.forEach((time) => {
            it(`initializes to values passed through props with time ${time}`, () => {
                // Arrange
                const currentRange = new FileFilter(
                    "date",
                    `RANGE(${startDate + time},${endDate + time})`
                );
                const { getByText } = render(
                    <DateRangePicker
                        onSearch={noop}
                        onReset={noop}
                        currentRange={currentRange}
                        type={AnnotationType.DATE}
                    />
                );
                expect(getByText(/May 23 2025/)).to.exist;
                // We currently subtract a day in UI to account for exclusive upper bound for FES date range filter
                expect(getByText(/Jun 02 2025/)).to.exist;
            });
        });

        // FMS formats dates as YYYY-MM-DDT00:00:00.000Z where time is ignored
        // so any date filter should drop the time info and only use the date part regardless of time zone
        times.forEach((time) => {
            it(`calls onSearch ignoring time data for type DATE at ${time}`, () => {
                // Arrange
                const onSearch = sandbox.spy();
                // Start with different date range so onSelect will be triggered by change
                const currentRange = new FileFilter(
                    "date",
                    `RANGE(${startDate + time},2025-05-24${time})`
                );
                const { getAllByRole, getByRole } = render(
                    <DateRangePicker
                        onSearch={onSearch}
                        onReset={noop}
                        currentRange={currentRange}
                        type={AnnotationType.DATE}
                    />
                );

                // Act
                const datePicker = getAllByRole("combobox").at(1); // first combobox is start date, second is end date
                if (datePicker) {
                    fireEvent.click(datePicker);
                    fireEvent.input(datePicker, ""); // start typing
                    fireEvent.click(getByRole("button", { name: /June/ })); // select month
                    fireEvent.click(getByRole("button", { name: "2, June, 2025" })); // select date
                }

                // Assert
                // Range will use next day (3 June) because of exclusive bound
                const expectedRangeString = `RANGE(${startDate}T00:00:00.000Z,${endDate}T00:00:00.000Z)`;
                expect(onSearch.callCount).to.be.greaterThan(0);
                expect(onSearch.calledWith(expectedRangeString)).to.be.true;
            });
        });

        // For the DateTime data type, T00:00:00.000Z represents an exact moment in time, so may render differently per time zone
        times.forEach((time) => {
            it(`calls onSearch with time data for the starting DATETIME at ${time}`, () => {
                // Arrange
                const onSearch = sandbox.spy();
                const currentRange = new FileFilter(
                    "date",
                    `RANGE(${startDate + time},${endDate + time})`
                );
                const { getAllByRole, getByRole } = render(
                    <DateRangePicker
                        onSearch={onSearch}
                        onReset={noop}
                        currentRange={currentRange}
                        type={AnnotationType.DATETIME}
                    />
                );
                // Act
                const datePicker = getAllByRole("combobox").at(1); // first combobox is start date, second is end date
                if (datePicker) {
                    fireEvent.click(datePicker);
                    fireEvent.input(datePicker, ""); // start typing
                    fireEvent.click(getByRole("button", { name: "3, June, 2025" })); // select different date to trigger onSearch
                }
                // Assert
                const expectedRange = new RegExp(`RANGE\\(${startDate}${time},2025-06`); // ending time/day will differ with time zone
                expect(onSearch.callCount).to.be.greaterThan(0);
                expect(onSearch.calledWithMatch(expectedRange)).to.be.true;
            });
        });
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
        fireEvent.click(getByTestId("base-button-reset-date"));
        expect(onReset.called).to.equal(true);
    });
});
