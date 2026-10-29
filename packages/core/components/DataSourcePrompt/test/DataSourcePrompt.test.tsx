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
        expect(getAllByText(/click to browse/).length).to.equal(2);
        expect(getByTestId("urlform-file-prompt-metadata-main")).to.exist;
        expect(getByTestId("urlform-file-prompt-provenance-main")).to.exist;

        // Select a column descriptor file
        fireEvent.change(getAllByRole("textbox")[0], { target: { value: "testFile.csv" } });
        fireEvent.submit(getByTestId("urlform-file-prompt-metadata-main"));

        // Only the provenance prompt still renders
        expect(getAllByText(/click to browse/).length).to.equal(1);
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
});
