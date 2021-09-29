import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import { noop } from "lodash";
import * as React from "react";

import SearchableDropdown from "..";

describe("<SearchableDropdown />", () => {
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
        const { getByText } = render(
            <SearchableDropdown
                options={options}
                onSearch={onSearch}
                searchValue=""
                selectedOption={selectedOption}
            />
        );

        // Act
        fireEvent.click(getByText(selectedOption)); // Open dropdown
        const input = getByText("Search");
        fireEvent.click(input); // Focus search input
        fireEvent.change(input, {
            target: { value: expected },
        });

        // Assert
        expect(actual).to.equal(expected);
    });

    it("selecting option closes dropdown", () => {
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
            },
        ];
        const { getByText } = render(
            <SearchableDropdown
                options={options}
                onSearch={noop}
                searchValue=""
                selectedOption={selectedOption}
            />
        );

        // Act
        fireEvent.click(getByText(selectedOption)); // Open dropdown

        // (sanity-check) check if modal is open
        expect(getByText("Search")).to.exist;
        expect(getByText(selectedOption)).to.not.exist;

        fireEvent.click(getByText(keyToClick)); // Click option

        // Assert
        expect(getByText("Search")).to.not.exist;
        expect(getByText(selectedOption)).to.exist;
    });
});
