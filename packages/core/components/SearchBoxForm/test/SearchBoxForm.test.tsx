import { render, fireEvent, screen } from "@testing-library/react";
import { expect } from "chai";
import { noop } from "lodash";
import * as React from "react";
import sinon from "sinon";

import SearchBoxForm from "..";
import FileFilter from "../../../entity/FileFilter";

describe("<SearchBoxForm />", () => {
    it("renders an input field for the search term", () => {
        // Arrange
        const { getAllByRole } = render(
            <SearchBoxForm
                fieldName={"Example Field"}
                onSearch={noop}
                onReset={noop}
                currentValue={undefined}
            />
        );
        // Assert
        expect(getAllByRole("searchbox").length).to.equal(1);
    });

    it("initializes to values passed through props if provided", () => {
        // Arrange
        const currentValue = new FileFilter("foo", "bar");

        render(
            <SearchBoxForm
                fieldName={"foo"}
                onSearch={noop}
                onReset={noop}
                currentValue={currentValue}
            />
        );

        // Should initialize to value provided, respectively
        expect(screen.getByRole<HTMLInputElement>("searchbox").value).to.equal("bar");
    });

    it("renders a 'Reset' button if given a callback", () => {
        // Arrange
        const onSearch = noop;
        const onReset = sinon.spy();

        // Act / Assert
        const { getByRole, getByLabelText } = render(
            <SearchBoxForm
                fieldName={"foo"}
                onSearch={onSearch}
                onReset={onReset}
                currentValue={undefined}
            />
        );
        // Enter values
        fireEvent.change(getByRole("searchbox"), {
            target: {
                value: "bar",
            },
        });

        // Sanity check
        expect(screen.getByRole<HTMLInputElement>("searchbox").value).to.equal("bar");

        // Hit reset
        expect(onReset.called).to.equal(false);
        fireEvent.click(getByLabelText("Clear text"));
        expect(onReset.called).to.equal(true);

        // Should clear min and max values
        expect(screen.getByRole<HTMLInputElement>("searchbox").value).to.equal("");
    });
});
