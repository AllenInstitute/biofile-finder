import { render, fireEvent } from "@testing-library/react";
import { expect } from "chai";
import { noop } from "lodash";
import * as React from "react";

import SearchBoxForm from "..";

describe("<SearchBoxForm/>", () => {
    // TODO: Update with the fuzzy search toggle when filters are complete
    it.skip("renders a list picker when 'List picker' option is selection", () => {
        // Act
        const { getByText, getByTestId } = render(
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
        expect(() => getByTestId("list-picker")).to.throw();

        // Select 'List picker' filter type
        fireEvent.click(getByText("List picker"));

        expect(() => getByTestId("list-picker")).to.not.throw();
    });
});
