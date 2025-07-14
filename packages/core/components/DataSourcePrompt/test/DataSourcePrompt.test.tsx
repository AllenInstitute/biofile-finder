import { configureMockStore } from "@aics/redux-utils";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import { initialState, reducer } from "../../../state";

import DataSourcePrompt from "..";
import styles from "../DataSourcePrompt.module.css";

describe("<DataSourcePrompt />", () => {
    it("hides and disables the load button when no files are selected", async () => {
        const { store } = configureMockStore({ state: initialState });
        const { getByText } = render(
            <Provider store={store}>
                <DataSourcePrompt />
            </Provider>
        );
        const loadButton = getByText(/LOAD/).closest("button");
        expect(loadButton?.hasAttribute("disabled")).to.be.true;
        expect(loadButton?.classList.contains(styles.hidden)).to.be.true;
    });

    it("shows the load button after a file is selected", () => {
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
        expect(loadButton?.classList.contains(styles.hidden)).to.be.false;
    });

    it("can distinguish between two FilePrompt components when advanced options are open", () => {
        const { store } = configureMockStore({ state: initialState, reducer });
        const { getByText, getByTestId, getAllByText, getAllByRole } = render(
            <Provider store={store}>
                <DataSourcePrompt />
            </Provider>
        );

        // Expand advanced options
        fireEvent.click(getByText(/Add metadata descriptor file/));

        // Two separate prompts render
        expect(getAllByText(/click to browse/).length).to.equal(2);
        expect(getAllByRole("textbox").length).to.equal(2);
        expect(getByTestId("urlform-file-prompt-metadata-main")).to.exist;

        const urlForm = getAllByRole("textbox").at(1);
        // Enter values in the second form
        if (urlForm) {
            // Check is necessary in order to fire event
            fireEvent.change(urlForm, {
                target: {
                    value: "testFile.csv",
                },
            });
            fireEvent.submit(urlForm);
        }

        // Only the first prompt still renders
        expect(getAllByText(/click to browse/).length).to.equal(1);
        expect(getByTestId("urlform-file-prompt-main")).to.exist;
        expect(() => getByTestId("urlform-file-prompt-metadata-main")).to.throw;
    });

    it("hides the advanced guidance info by default", () => {
        const { store } = configureMockStore({ state: initialState, reducer });
        const { getByText } = render(
            <Provider store={store}>
                <DataSourcePrompt />
            </Provider>
        );
        expect(() => getByText(/Advanced/)).to.throw;
    });

    it("shows the advanced guidance info when expanded", () => {
        const { store } = configureMockStore({ state: initialState, reducer });
        const { getByText } = render(
            <Provider store={store}>
                <DataSourcePrompt />
            </Provider>
        );
        const expandInfoButton = getByText("Show more");
        fireEvent.click(expandInfoButton);
        expect(getByText(/Advanced/)).to.exist;
    });
});
