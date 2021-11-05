import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import { noop } from "lodash";
import * as React from "react";

import SearchableDropdown from "..";

describe("<SearchableDropdown />", () => {
    const searchPlaceholder = "Search...";

    it("sends 'onSearch' feedback on user input", () => {
        // Arrange
        const expected = "My Collection";
        let actual = undefined;
        function onSearch(searchValue: string) {
            actual = searchValue;
        }
        const selectedOption = "default";
        const options = [
            {
                key: "other",
            },
            {
                key: selectedOption,
                text: selectedOption,
            },
        ];
        const { getByText, getByPlaceholderText } = render(
            <SearchableDropdown
                options={options}
                onSearch={onSearch}
                searchValue=""
                selectedOption={selectedOption}
            />
        );

        // Act
        fireEvent.click(getByText(selectedOption)); // Open dropdown
        const input = getByPlaceholderText(searchPlaceholder);
        fireEvent.click(input); // Focus search input
        fireEvent.change(input, {
            target: { value: expected },
        });

        // Assert
        expect(actual).to.equal(expected.toLowerCase());
    });

    it("selecting option closes dropdown", async () => {
        // Arrange
        const selectedOption = "default";
        const keyToClick = "Assay Dev";
        const options = [
            {
                key: "other",
            },
            {
                key: selectedOption,
            },
            {
                key: keyToClick,
                text: keyToClick,
            },
        ];
        const { getByDisplayValue, getByText } = render(
            <SearchableDropdown
                options={options}
                onSearch={noop}
                searchValue=""
                selectedOption={selectedOption}
            />
        );

        // Act
        fireEvent.click(getByDisplayValue(selectedOption)); // Open dropdown

        // (sanity-check) check if modal is open
        expect(() => getByDisplayValue(selectedOption)).to.throw();

        fireEvent.click(getByText(keyToClick)); // Click option

        // // Assert
        expect(getByDisplayValue(selectedOption)).to.exist;
    });
});
