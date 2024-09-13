import { render, fireEvent } from "@testing-library/react";
import { expect } from "chai";
import { noop } from "lodash";
import * as React from "react";
import sinon from "sinon";

import SearchBoxForm from "..";

describe("<SearchBoxForm/>", () => {
    it("renders clickable fuzzy search toggle", () => {
        // Arrange
        const onToggleFuzzySearch = sinon.spy();
        const onSearch = sinon.spy();

        const { getByText, getByRole } = render(
            <SearchBoxForm
                fieldName={"foo"}
                onSelectAll={noop}
                onDeselectAll={noop}
                onToggleFuzzySearch={onToggleFuzzySearch}
                onSearch={onSearch}
                defaultValue={undefined}
            />
        );

        // Consistency checks
        expect(getByText("Off")).to.exist;
        expect(onSearch.called).to.equal(false);
        expect(onToggleFuzzySearch.called).to.equal(false);

        // Act
        fireEvent.click(getByRole("switch"));
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
        expect(getByText("On")).to.exist;
        expect(onSearch.called).to.equal(true);
        expect(onToggleFuzzySearch.called).to.equal(true);
    });

    it("defaults to on when fuzzy searching prop is passed as true", () => {
        // Arrange
        const { getByText, getByRole } = render(
            <SearchBoxForm
                fieldName={"foo"}
                onSelectAll={noop}
                onDeselectAll={noop}
                onToggleFuzzySearch={noop}
                fuzzySearchEnabled={true}
                onSearch={noop}
                defaultValue={undefined}
            />
        );
        // Consistency check
        expect(getByText("On")).to.exist;

        // Act
        fireEvent.click(getByRole("switch"));

        // Assert
        expect(getByText("Off")).to.exist;
    });
});
