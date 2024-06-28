import { render, fireEvent, screen } from "@testing-library/react";
import { expect } from "chai";
import { noop } from "lodash";
import * as React from "react";
import sinon from "sinon";

import FileFilter from "../../../../entity/FileFilter";

import SearchBoxForm from "..";

describe("<SearchBoxForm/>", () => {
    it("renders an input field for the search term", () => {
        // Arrange
        const { getAllByRole } = render(
            <SearchBoxForm
                onSearch={noop}
                defaultValue={undefined} 
                fieldName=""
                items={[]}
                onSelect={noop}
                onSelectAll={noop}
                onDeselect={noop}
                onDeselectAll={noop}
            />
        );
        // Assert
        expect(getAllByRole("SearchBoxForm").length).to.equal(1);
    });

    it("initializes to values passed through props if provided", () => {
        // Arrange
        const currentValue = new FileFilter("foo", "bar");

        render(
            <SearchBoxForm
                onSearch={noop}
                defaultValue={currentValue} 
                fieldName=""
                items={[]}
                onSelect={noop}
                onSelectAll={noop}
                onDeselect={noop}
                onDeselectAll={noop}
            />
        )

        // Should initialize to value provided, respectively
        expect(screen.getByRole<HTMLInputElement>("SearchBoxForm").value).to.equal("bar");
    });

    it("renders a 'Reset' button if given a callback", () => {
        // Arrange
        const onSearch = noop;
        const onReset = sinon.spy();

        // Act / Assert
        const { getByRole, getByLabelText } = render(
            <SearchBoxForm 
                onSearch={onSearch}
                defaultValue={undefined} 
                fieldName=""
                items={[]}
                onSelect={noop}
                onSelectAll={noop}
                onDeselect={noop}
                onDeselectAll={onReset}
            />
        );
        // Enter values
        fireEvent.change(getByRole("SearchBoxForm"), {
            target: {
                value: "bar",
            },
        });

        // Sanity check
        expect(screen.getByRole<HTMLInputElement>("SearchBoxForm").value).to.equal("bar");

        // Hit reset
        expect(onReset.called).to.equal(false);
        fireEvent.click(getByLabelText("Clear text"));
        expect(onReset.called).to.equal(true);

        expect(screen.getByRole<HTMLInputElement>("SearchBoxForm").value).to.equal("");
    });

    it("renders a list picker when 'List picker' option is selection", () => {
        // Act
        const { getByLabelText, getByTestId } = render(
            <SearchBoxForm
                fieldName={"foo"}
                onSelect={noop}
                onSelectAll={noop}
                onDeselect={noop}
                onDeselectAll={noop}
                items={[{ value: "foo", selected: false, displayValue: "foo" }]}
                onSearch={noop}
                defaultValue={undefined}
            />
        );

        // Sanity check
        expect(getByTestId("list-picker")).to.be.undefined;

        // Select 'List picker' filter type
        fireEvent.click(getByLabelText("List picker"));

        expect(getByTestId("list-picker")).to.not.be.undefined;
    })
});
