import { fireEvent, render, screen } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import DataSourcePrompt from "..";
import { initialState, reducer } from "../../../state";
import { configureMockStore } from "../../../util/redux-utils";

describe("<DataSourcePrompt />", () => {
    it("disables the load button when no files are selected", async () => {
        const { store } = configureMockStore({ state: initialState });
        const { getByText } = render(
            <Provider store={store}>
                <DataSourcePrompt />
            </Provider>
        );
        const loadButton = getByText(/LOAD/).closest("button");
        expect(loadButton?.hasAttribute("disabled")).to.be.true;
    });

    it("enables the load button after a file is selected", () => {
        // Arrange
        const { store } = configureMockStore({ state: initialState });
        const { getByText, getByRole, getByTestId } = render(
            <Provider store={store}>
                <DataSourcePrompt />
            </Provider>
        );

        // Act
        // Enter values
        fireEvent.change(getByRole("textbox"), {
            target: {
                value: "testFile.csv",
            },
        });
        // consistency check
        expect(screen.getByRole<HTMLInputElement>("textbox").value).to.equal("testFile.csv");

        fireEvent.submit(getByTestId(/urlform/));

        // Assert
        const loadButton = getByText(/LOAD/).closest("button");
        expect(loadButton?.hasAttribute("disabled")).to.be.false;
    });

    it("only offers descriptor files after a primary file is selected", () => {
        const { store } = configureMockStore({ state: initialState, reducer });
        const { getByRole, getByTestId, queryByText } = render(
            <Provider store={store}>
                <DataSourcePrompt />
            </Provider>
        );
        expect(queryByText(/Add a column descriptor file/)).to.be.null;
        expect(queryByText(/Add a provenance descriptor file/)).to.be.null;

        fireEvent.change(getByRole("textbox"), { target: { value: "testFile.csv" } });
        fireEvent.submit(getByTestId("urlform-file-prompt-main"));

        expect(queryByText(/Describe columns with supplemental metadata/)).to.exist;
        expect(queryByText(/Add a column descriptor file/)).to.exist;
        expect(queryByText(/Add a provenance descriptor file/)).to.exist;
    });

    it("can distinguish between all FilePrompt components when descriptor files are added", () => {
        const { store } = configureMockStore({ state: initialState, reducer });
        const { getByText, getByTestId, getAllByText, getAllByRole, queryByTestId } = render(
            <Provider store={store}>
                <DataSourcePrompt />
            </Provider>
        );

        // Select the primary file so descriptor options appear
        fireEvent.change(getAllByRole("textbox")[0], { target: { value: "primary.csv" } });
        fireEvent.submit(getByTestId("urlform-file-prompt-main"));

        // Open both descriptor prompts
        fireEvent.click(getByText(/Add a column descriptor file/));
        fireEvent.click(getByText(/Add a provenance descriptor file/));

        // Primary prompt is replaced by its selected file; the two descriptor prompts render
        expect(getAllByText("browse").length).to.equal(2);
        expect(getByTestId("urlform-file-prompt-metadata-main")).to.exist;
        expect(getByTestId("urlform-file-prompt-provenance-main")).to.exist;

        // Select a column descriptor file
        fireEvent.change(getAllByRole("textbox")[0], { target: { value: "testFile.csv" } });
        fireEvent.submit(getByTestId("urlform-file-prompt-metadata-main"));

        // Only the provenance prompt still renders
        expect(getAllByText("browse").length).to.equal(1);
        expect(queryByTestId("urlform-file-prompt-metadata-main")).to.be.null;
        expect(getByTestId("urlform-file-prompt-provenance-main")).to.exist;
    });

    it("links to the user guide in a new tab", () => {
        const { store } = configureMockStore({ state: initialState, reducer });
        const { getByText } = render(
            <Provider store={store}>
                <DataSourcePrompt />
            </Provider>
        );
        const link = getByText("Read full guidance").closest("a");
        expect(link?.getAttribute("href")).to.equal(
            "https://bff.allencell.org/user-guide/getting-started/creating-a-metadata-file"
        );
        expect(link?.getAttribute("target")).to.equal("_blank");
    });

    describe("accessibility", () => {
        function renderWithPrimaryFile() {
            const { store } = configureMockStore({ state: initialState, reducer });
            const utils = render(
                <Provider store={store}>
                    <DataSourcePrompt />
                </Provider>
            );
            fireEvent.change(utils.getByRole("textbox"), { target: { value: "primary.csv" } });
            fireEvent.submit(utils.getByTestId("urlform-file-prompt-main"));
            return utils;
        }

        it("labels the dropzone, URL field and clear button", () => {
            const { store } = configureMockStore({ state: initialState });
            const { getByRole, getByTestId } = render(
                <Provider store={store}>
                    <DataSourcePrompt />
                </Provider>
            );

            expect(getByRole("textbox", { name: "Data source URL" })).to.exist;
            expect(getByTestId("dropzone").getAttribute("role")).to.equal("button");
            expect(getByTestId("dropzone").getAttribute("aria-label")).to.contain("Browse");

            fireEvent.change(getByRole("textbox"), { target: { value: "a.csv" } });
            expect(getByRole("button", { name: "Clear URL" })).to.exist;
        });

        it("clears the URL from the keyboard", () => {
            const { store } = configureMockStore({ state: initialState });
            const { getByRole } = render(
                <Provider store={store}>
                    <DataSourcePrompt />
                </Provider>
            );
            fireEvent.change(getByRole("textbox"), { target: { value: "a.csv" } });

            fireEvent.keyDown(getByRole("button", { name: "Clear URL" }), { key: "Enter" });

            expect(screen.getByRole<HTMLInputElement>("textbox").value).to.equal("");
        });

        it("moves focus to the remove button once a file is selected, then back to the URL field", () => {
            const { getByRole } = renderWithPrimaryFile();

            const removeButton = getByRole("button", { name: "Remove file" });
            expect(document.activeElement).to.equal(removeButton);

            fireEvent.click(removeButton);

            expect(document.activeElement).to.equal(
                getByRole("textbox", { name: "Data source URL" })
            );
        });

        it("focuses the title of a descriptor prompt when opened, not its URL field", () => {
            const { getByText, getByRole } = renderWithPrimaryFile();

            fireEvent.click(getByText(/Add a column descriptor file/));

            const title = getByRole("heading", { name: "Column descriptor file" });
            expect(document.activeElement).to.equal(title);
        });

        it("returns focus to the opening button when a descriptor prompt is closed", () => {
            const { getByText, getByRole } = renderWithPrimaryFile();
            fireEvent.click(getByText(/Add a column descriptor file/));

            fireEvent.click(getByRole("button", { name: /Close column descriptor file prompt/i }));

            expect(document.activeElement).to.equal(
                getByText(/Add a column descriptor file/).closest("button")
            );
        });

        it("announces file rejection errors", async () => {
            const { store } = configureMockStore({ state: initialState });
            const { findByRole, getByTestId } = render(
                <Provider store={store}>
                    <DataSourcePrompt />
                </Provider>
            );
            const file = { name: "test.png", type: "image/png" };

            fireEvent.drop(getByTestId("dropzone"), {
                dataTransfer: {
                    files: [file],
                    items: [{ kind: "file", type: file.type, getAsFile: () => file }],
                    types: ["Files"],
                },
            });

            const alert = await findByRole("alert");
            expect(alert.textContent).to.contain("Invalid file type");
        });
    });
});
