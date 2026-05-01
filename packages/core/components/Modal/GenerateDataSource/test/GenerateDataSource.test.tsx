import { render, fireEvent } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";

import GenerateDataSource from "..";

// ---------------------------------------------------------------------------
// UI tests
// ---------------------------------------------------------------------------

describe("<GenerateDataSource />", () => {
    const noop = () => undefined;

    it("renders the modal with folder path input (Python tab)", () => {
        const { getByPlaceholderText } = render(<GenerateDataSource onDismiss={noop} />);
        expect(getByPlaceholderText("/data/my_images")).to.exist;
    });

    it("shows default glob pattern", () => {
        const { getAllByRole } = render(<GenerateDataSource onDismiss={noop} />);
        const textboxes = getAllByRole("textbox") as HTMLInputElement[];
        const patternInput = textboxes.find((t) => t.value === "**/*");
        expect(patternInput, "file pattern input with default **/*").to.exist;
    });

    it("shows default output file", () => {
        const { getAllByRole } = render(<GenerateDataSource onDismiss={noop} />);
        const textboxes = getAllByRole("textbox") as HTMLInputElement[];
        const outputInput = textboxes.find((t) => t.value === "inventory.csv");
        expect(outputInput, "output file input with default inventory.csv").to.exist;
    });

    it("generates code that includes the entered folder path", () => {
        const { getByPlaceholderText, getByText } = render(<GenerateDataSource onDismiss={noop} />);
        fireEvent.change(getByPlaceholderText("/data/my_images"), {
            target: { value: "/my/folder" },
        });
        expect(getByText(/\/my\/folder/)).to.exist;
    });

    it("generates code that includes pathlib.glob with pattern", () => {
        const { getByText } = render(<GenerateDataSource onDismiss={noop} />);
        expect(getByText(/FOLDER\.glob/)).to.exist;
    });

    it("shows bioio block when BioIO checkbox is checked", () => {
        const { getByRole, getByText } = render(<GenerateDataSource onDismiss={noop} />);
        fireEvent.click(getByRole("checkbox"));
        expect(getByText(/BioImage/)).to.exist;
    });

    it("generates parquet save call when output file has .parquet extension", () => {
        const { getByDisplayValue, getByText } = render(<GenerateDataSource onDismiss={noop} />);
        fireEvent.change(getByDisplayValue("inventory.csv"), {
            target: { value: "output.parquet" },
        });
        expect(getByText(/to_parquet/)).to.exist;
    });

    it("switches to browser mode when the browser tab is clicked", () => {
        const { getByText, getAllByText } = render(<GenerateDataSource onDismiss={noop} />);
        const browserTab = getByText(/Parse folder in browser/i);
        fireEvent.click(browserTab);
        // The hint text appears in the browser panel
        const hints = getAllByText(/Select a local folder/i);
        expect(hints.length).to.be.greaterThan(0);
    });

    it("shows the folder picker button in browser mode", () => {
        const { getByText } = render(<GenerateDataSource onDismiss={noop} />);
        fireEvent.click(getByText(/Parse folder in browser/i));
        expect(getByText(/Select folder/i)).to.exist;
    });
});
