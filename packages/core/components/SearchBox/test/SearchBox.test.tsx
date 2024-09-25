import { render, fireEvent, screen } from "@testing-library/react";
import { expect } from "chai";
import { noop } from "lodash";
import * as React from "react";
import sinon from "sinon";

import FileFilter from "../../../entity/FileFilter";

import SearchBox from "..";

describe("<SearchBox/>", () => {
    it("renders an input field for the search term", () => {
        // Arrange
        const { getAllByRole } = render(
            <SearchBox onSearch={noop} onReset={noop} defaultValue={undefined} />
        );
        // Assert
        expect(getAllByRole("searchbox").length).to.equal(1);
    });

    it("initializes to values passed through props if provided", () => {
        // Arrange
        const currentValue = new FileFilter("foo", "bar");

        render(<SearchBox onSearch={noop} onReset={noop} defaultValue={currentValue} />);

        // Should initialize to value provided, respectively
        expect(screen.getByRole<HTMLInputElement>("searchbox").value).to.equal("bar");
    });

    it("renders a 'Reset' button if given a callback", () => {
        // Arrange
        const onSearch = noop;
        const onReset = sinon.spy();

        // Act / Assert
        const { getByRole, getByLabelText } = render(
            <SearchBox onSearch={onSearch} onReset={onReset} defaultValue={undefined} />
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

        expect(screen.getByRole<HTMLInputElement>("searchbox").value).to.equal("");
    });

    it("renders a clickable button when prop is present that triggers search", () => {
        // Arrange
        const onSearch = sinon.spy();

        // Act / Assert
        const { getByRole, getByLabelText } = render(
            <SearchBox
                onSearch={onSearch}
                onReset={noop}
                defaultValue={undefined}
                showSubmitButton
            />
        );
        // Enter values
        fireEvent.change(getByRole("searchbox"), {
            target: {
                value: "bar",
            },
        });

        // Hit reset
        expect(onSearch.called).to.equal(false);
        fireEvent.click(getByLabelText("Submit"));
        expect(onSearch.called).to.equal(true);
    });
});
