import { render, fireEvent, screen } from "@testing-library/react";
import { expect } from "chai";
import { noop } from "lodash";
import * as React from "react";
import sinon from "sinon";

import NumberRangePicker, { ListItem } from "..";
import FileFilter from "../../../entity/FileFilter";

describe("<NumberRangePicker />", () => {
    it("renders input fields for min and max values initialized to overall min/max", () => {
        // Arrange
        const items: ListItem[] = ["0", "20"].map((val) => ({
            displayValue: val,
            value: val,
        }));

        // Act / Assert
        const { getByText } = render(
            <NumberRangePicker
                items={items}
                onSearch={noop}
                onReset={noop}
                currentRange={undefined}
            />
        );

        // Should render both input fields
        expect(getByText("Min (inclusive)")).to.not.be.undefined;
        expect(getByText("Max (exclusive)")).to.not.be.undefined;

        // Should initialize to min and max item provided, respectively
        expect(screen.getByTitle<HTMLInputElement>(/^Min/).value).to.equal("0");
        expect(screen.getByTitle<HTMLInputElement>(/^Max/).value).to.equal("20");
    });

    it("initializes to values passed through props if provided", () => {
        // Arrange
        const currentRange = new FileFilter("foo", "RANGE(0, 12.34)");
        const items: ListItem[] = ["-20", "20"].map((val) => ({
            displayValue: val,
            value: val,
        }));

        render(
            <NumberRangePicker
                items={items}
                onSearch={noop}
                onReset={noop}
                currentRange={currentRange}
            />
        );

        // Should initialize to min and max item provided, respectively
        expect(screen.getByTitle<HTMLInputElement>(/^Min/).value).to.equal("0");
        expect(screen.getByTitle<HTMLInputElement>(/^Max/).value).to.equal("12.34");
    });

    it("renders a 'Reset' button if given a callback", () => {
        // Arrange
        const onSearch = noop;
        const onReset = sinon.spy();
        const items: ListItem[] = ["0", "20"].map((val) => ({
            displayValue: val,
            value: val,
        }));

        // Act / Assert
        const { getByTestId } = render(
            <NumberRangePicker
                items={items}
                onSearch={onSearch}
                onReset={onReset}
                currentRange={undefined}
            />
        );

        // Sanity check
        expect(screen.getByTitle<HTMLInputElement>(/^Min/).value).to.equal("0");
        expect(screen.getByTitle<HTMLInputElement>(/^Max/).value).to.equal("20");

        // Hit reset
        expect(onReset.called).to.equal(false);
        fireEvent.click(getByTestId("base-button-Reset filter"));
        expect(onReset.called).to.equal(true);

        // Should clear min and max values
        expect(screen.getByTitle<HTMLInputElement>(/^Min/).value).to.equal("");
        expect(screen.getByTitle<HTMLInputElement>(/^Max/).value).to.equal("");
    });

    it("displays available min and max of items", () => {
        // Arrange
        const items: ListItem[] = ["-2", "1", "20", "42"].map((val) => ({
            displayValue: val,
            value: val,
        }));
        const { getByText } = render(
            <NumberRangePicker
                items={items}
                onReset={noop}
                onSearch={noop}
                currentRange={undefined}
            />
        );

        // Act / Assert
        expect(
            getByText(
                `Full range available: ${items[0].displayValue}, ${
                    items[items.length - 1].displayValue
                }`
            )
        ).to.exist;
    });
});
