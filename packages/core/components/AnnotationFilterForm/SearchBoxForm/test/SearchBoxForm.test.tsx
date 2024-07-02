import { render, fireEvent } from "@testing-library/react";
import { expect } from "chai";
import { noop } from "lodash";
import * as React from "react";

import SearchBoxForm from "..";

describe("<SearchBoxForm/>", () => {
    it("renders a list picker when 'List picker' option is selection", () => {
        // Act
        const { getByText, getByTestId } = render(
            <SearchBoxForm
                fieldName={"foo"}
                onSelect={noop}
                onSelectAll={noop}
                onDeselect={noop}
                onDeselectAll={noop}
                onToggleFuzzySearch={noop}
                items={[{ value: "foo", selected: false, displayValue: "foo" }]}
                onSearch={noop}
                defaultValue={undefined}
            />
        );

        // Consistency checks
        expect(() => getByTestId("list-picker")).to.throw();
        fireEvent.click(getByText("Partial match search"));
        expect(() => getByTestId("list-picker")).to.throw();

        // Select 'List picker' filter type
        fireEvent.click(getByText("List picker"));

        expect(() => getByTestId("list-picker")).to.not.throw();
    });
});
