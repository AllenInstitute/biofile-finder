import { render, fireEvent } from "@testing-library/react";
import { expect } from "chai";
import { noop } from "lodash";
import * as React from "react";
import sinon from "sinon";

import SearchBoxForm from "..";

describe("<SearchBoxForm/>", () => {
    it("renders clickable fuzzy search toggle", () => {
        // Arrange
        const onSearch = sinon.spy();

        const { getByText, getByRole } = render(
            <SearchBoxForm
                fieldName={"foo"}
                onSelectAll={noop}
                onDeselectAll={noop}
                onSearch={onSearch}
                defaultValue={undefined}
            />
        );

        // Consistency checks
        expect(getByText("Enable fuzzy (non-exact) matching")).to.exist;
        expect(onSearch.called).to.equal(false);

        // Act
        fireEvent.click(getByRole("checkbox"));
        // Enter values
        fireEvent.change(getByRole("searchbox"), {
            target: {
                value: "bar",
            },
        });
        fireEvent.keyDown(getByRole("searchbox"), {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            charCode: 13,
        });

        // Assert
        expect(getByText("Disable fuzzy (non-exact) matching")).to.exist;
        expect(onSearch.called).to.equal(true);
    });

    it("defaults to on when fuzzy searching prop is passed as true", () => {
        // Arrange
        const { getByText, getByRole } = render(
            <SearchBoxForm
                fieldName={"foo"}
                onSelectAll={noop}
                onDeselectAll={noop}
                fuzzySearchEnabled={true}
                onSearch={noop}
                defaultValue={undefined}
            />
        );
        // Consistency check
        expect(getByText("Disable fuzzy (non-exact) matching")).to.exist;

        // Act
        fireEvent.click(getByRole("checkbox"));

        // Assert
        expect(getByText("Enable fuzzy (non-exact) matching")).to.exist;
    });
});
