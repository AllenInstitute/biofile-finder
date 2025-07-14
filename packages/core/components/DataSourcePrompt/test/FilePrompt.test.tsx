import { configureMockStore } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import { range } from "lodash";
import * as React from "react";
import { Provider } from "react-redux";

import { initialState } from "../../../state";

import FilePrompt from "..";

// NodeJS < v20 does not provide support for the WebAPI File class
interface MockFile {
    name: string;
    type: string;
}

describe("<FilePrompt />", () => {
    function mockFileData(files: MockFile[]) {
        return {
            dataTransfer: {
                files,
                items: files.map((file) => ({
                    kind: "file",
                    type: file.type,
                    getAsFile: () => file,
                })),
                types: ["Files"],
            },
        };
    }

    it("displays error for invalid file types", async () => {
        // Arrange
        const { store } = configureMockStore({ state: initialState });
        const { findByText, getByTestId } = render(
            <Provider store={store}>
                <FilePrompt />
            </Provider>
        );
        const file: MockFile = {
            name: "test.png",
            type: "image/png",
        };
        const data = mockFileData([file]);
        fireEvent.drop(getByTestId("dropzone"), data);
        const errorMessage = await findByText(/Invalid file type/);
        expect(errorMessage).to.exist;
        expect(errorMessage.textContent).to.contain("test.png");
    });

    it("displays error for too many selected files", async () => {
        // Arrange
        const { store } = configureMockStore({ state: initialState });
        const { findByText, getByTestId } = render(
            <Provider store={store}>
                <FilePrompt />
            </Provider>
        );
        const data = mockFileData(
            range(3).map((idx) => {
                return {
                    name: `test${idx}.csv`,
                    type: "text/csv",
                };
            })
        );
        fireEvent.drop(getByTestId("dropzone"), data);
        const errorMessage = await findByText(/Too many files/);
        expect(errorMessage).to.exist;
        range(3).forEach((index) => {
            expect(errorMessage.textContent).to.contain(`test${index}.csv`);
        });
        expect(errorMessage.textContent).to.contain(", and");
    });
});
