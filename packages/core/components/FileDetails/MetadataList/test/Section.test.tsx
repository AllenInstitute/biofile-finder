import { render, fireEvent } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";

import Section from "../Section";
import { MetadataValue } from "../../../../services/FileService";

const ChildRow = ({ name, value }: { name: string; value: MetadataValue }) => (
    <div data-testid="child-row">
        {name}: {String(value)}
    </div>
);

const emptyRows: Record<string, MetadataValue>[] = [];

describe("<Section />", () => {
    it("renders the label row", () => {
        const { getByText } = render(
            <Section row={<span>My Label</span>} childRows={emptyRows}>
                {ChildRow}
            </Section>
        );
        expect(getByText("My Label")).to.exist;
    });

    it("renders child rows when expanded (default)", () => {
        const childRows: Record<string, MetadataValue>[] = [{ Color: ["blue"], Size: ["Large"] }];
        const { getAllByTestId } = render(
            <Section row={<span>Parent</span>} childRows={childRows}>
                {ChildRow}
            </Section>
        );
        expect(getAllByTestId("child-row")).to.have.length(2);
    });

    it("hides child rows after clicking the collapse toggle", () => {
        const childRows: Record<string, MetadataValue>[] = [{ Color: ["blue"] }];
        const { getAllByTestId, queryAllByTestId, getByTestId } = render(
            <Section row={<span>Parent</span>} childRows={childRows}>
                {ChildRow}
            </Section>
        );
        expect(getAllByTestId("child-row")).to.have.length(1);
        // ContentLengthToggle renders an Icon (not a button); click its data-testid
        fireEvent.click(getByTestId("collapse-nested-fields"));
        expect(queryAllByTestId("child-row")).to.have.length(0);
    });

    it("does not show a toggle when there are no child rows", () => {
        const { queryByTestId } = render(
            <Section row={<span>Parent</span>} childRows={emptyRows}>
                {ChildRow}
            </Section>
        );
        expect(queryByTestId("collapse-nested-fields")).to.be.null;
        expect(queryByTestId("expand-nested-fields")).to.be.null;
    });

    it("renders multiple child row groups", () => {
        const childRows: Record<string, MetadataValue>[] = [{ A: ["1"] }, { B: ["2"] }];
        const { getAllByTestId } = render(
            <Section row={<span>Parent</span>} childRows={childRows}>
                {ChildRow}
            </Section>
        );
        expect(getAllByTestId("child-row")).to.have.length(2);
    });
});
