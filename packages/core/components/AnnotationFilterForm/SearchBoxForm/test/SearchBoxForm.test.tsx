import { render, fireEvent, screen } from "@testing-library/react";
import { expect } from "chai";
import { noop } from "lodash";
import * as React from "react";
import sinon from "sinon";

import SearchBoxForm from "..";
import { AnnotationType } from "../../../../entity/AnnotationFormatter";
import FileFilter, { FilterType } from "../../../../entity/FileFilter";

describe("<SearchBoxForm/>", () => {
    function makeFilter(value: string, type: FilterType) {
        return new FileFilter("foo", value, type, AnnotationType.STRING);
    }

    function submitSearch(searchbox: HTMLElement, value: string) {
        fireEvent.change(searchbox, { target: { value } });
        fireEvent.keyDown(searchbox, { key: "Enter", code: "Enter", keyCode: 13, charCode: 13 });
    }

    it("defaults to contains and submits searches with FilterType.FUZZY", () => {
        // Arrange
        const onSearch = sinon.spy();
        const { getByRole, getByDisplayValue } = render(
            <SearchBoxForm
                filters={[]}
                onClearAll={noop}
                onRemoveFilter={noop}
                onSearch={onSearch}
            />
        );
        expect(getByDisplayValue("Contains")).to.exist;

        // Act
        submitSearch(getByRole("searchbox"), "bar");

        // Assert
        expect(onSearch.calledOnceWith("bar", FilterType.FUZZY)).to.equal(true);
    });

    it("seeds the exact match operator from committed exact filters", () => {
        // Arrange
        const onSearch = sinon.spy();
        const { getByRole, getByDisplayValue } = render(
            <SearchBoxForm
                filters={[makeFilter("baz", FilterType.DEFAULT)]}
                onClearAll={noop}
                onRemoveFilter={noop}
                onSearch={onSearch}
            />
        );
        expect(getByDisplayValue("Exactly matches")).to.exist;

        // Act
        submitSearch(getByRole("searchbox"), "bar");

        // Assert
        expect(onSearch.calledOnceWith("bar", FilterType.DEFAULT)).to.equal(true);
    });

    it("clears the search input after a search is submitted", () => {
        // Arrange
        const { getByRole } = render(
            <SearchBoxForm filters={[]} onClearAll={noop} onRemoveFilter={noop} onSearch={noop} />
        );

        // Act
        submitSearch(getByRole("searchbox"), "bar");

        // Assert
        expect((getByRole("searchbox") as HTMLInputElement).value).to.equal("");
    });

    it("seeds the contains operator from committed fuzzy filters and submits with FilterType.FUZZY", () => {
        // Arrange
        const onSearch = sinon.spy();
        const { getByRole, getByDisplayValue, getByText } = render(
            <SearchBoxForm
                filters={[makeFilter("baz", FilterType.FUZZY)]}
                onClearAll={noop}
                onRemoveFilter={noop}
                onSearch={onSearch}
            />
        );
        expect(getByDisplayValue("Contains")).to.exist;
        expect(getByText("Contains:")).to.exist;

        // Act
        submitSearch(getByRole("searchbox"), "bar");

        // Assert
        expect(onSearch.calledOnceWith("bar", FilterType.FUZZY)).to.equal(true);
    });

    it("renders committed values as removable chips with a clear all", () => {
        // Arrange
        const onClearAll = sinon.spy();
        const onRemoveFilter = sinon.spy();
        const filters = [
            makeFilter("bar", FilterType.DEFAULT),
            makeFilter("baz", FilterType.DEFAULT),
        ];
        const { getByText, getByRole } = render(
            <SearchBoxForm
                filters={filters}
                onClearAll={onClearAll}
                onRemoveFilter={onRemoveFilter}
                onSearch={noop}
            />
        );
        expect(getByText("Exactly matches:")).to.exist;
        expect(getByText("bar")).to.exist;
        expect(getByText("baz")).to.exist;

        // Act
        fireEvent.click(getByRole("button", { name: "Remove bar" }));
        fireEvent.click(getByRole("button", { name: "Clear all" }));

        // Assert
        expect(onRemoveFilter.calledOnceWith(filters[0])).to.equal(true);
        expect(onClearAll.calledOnce).to.equal(true);
    });

    it("shows an exact-match error only after blur when the value is not in the list", () => {
        // Arrange
        const errorText = /No files found with exactly matching value/;
        const { getByRole, queryByText } = render(
            <SearchBoxForm
                availableValues={["bar", "baz"]}
                filters={[makeFilter("bar", FilterType.DEFAULT)]}
                onClearAll={noop}
                onRemoveFilter={noop}
                onSearch={noop}
            />
        );

        // Act: type a value that isn't in the list
        fireEvent.change(getByRole("searchbox"), { target: { value: "qux" } });

        // Assert: no error while typing
        expect(queryByText(errorText)).to.equal(null);

        // Act: leave the input
        fireEvent.blur(getByRole("searchbox"));

        // Assert: error shows
        expect(queryByText(errorText)).to.exist;
    });

    it("does not show the exact-match error when the value exists in the list", () => {
        // Arrange
        const errorText = /No files found with exactly matching value/;
        const { getByRole, queryByText } = render(
            <SearchBoxForm
                availableValues={["bar", "baz"]}
                filters={[makeFilter("bar", FilterType.DEFAULT)]}
                onClearAll={noop}
                onRemoveFilter={noop}
                onSearch={noop}
            />
        );

        // Act: type a value that is in the list and leave the input
        fireEvent.change(getByRole("searchbox"), { target: { value: "baz" } });
        fireEvent.blur(getByRole("searchbox"));

        // Assert: no error
        expect(queryByText(errorText)).to.equal(null);
    });

    it("does not show the exact-match error for the Contains operator", () => {
        // Arrange
        const errorText = /No files found with exactly matching value/;
        const { getByRole, queryByText } = render(
            <SearchBoxForm
                availableValues={["bar", "baz"]}
                filters={[makeFilter("bar", FilterType.FUZZY)]}
                onClearAll={noop}
                onRemoveFilter={noop}
                onSearch={noop}
            />
        );

        // Act: type a value that isn't in the list and leave the input
        fireEvent.change(getByRole("searchbox"), { target: { value: "qux" } });
        fireEvent.blur(getByRole("searchbox"));

        // Assert: no error, Contains searches by substring
        expect(queryByText(errorText)).to.equal(null);
    });

    it("warns that results will be replaced only when the operator differs from committed filters", () => {
        // Arrange
        const warningText = /replace the current results/;
        const { getByRole, queryByText } = render(
            <SearchBoxForm
                filters={[makeFilter("bar", FilterType.DEFAULT)]}
                onClearAll={noop}
                onRemoveFilter={noop}
                onSearch={noop}
            />
        );

        // Act: type with the same operator selected
        fireEvent.change(getByRole("searchbox"), { target: { value: "baz" } });

        // Assert: no warning
        expect(queryByText(warningText)).to.equal(null);

        // Act: switch the operator to Contains
        fireEvent.click(getByRole("presentation", { hidden: true }));
        fireEvent.click(screen.getByText("Contains"));

        // Assert: warning shows, and committed chips keep their original label
        expect(queryByText(warningText)).to.exist;
        expect(queryByText("Exactly matches:")).to.exist;
    });
});
