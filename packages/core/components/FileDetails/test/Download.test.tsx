import { configureMockStore, mergeState } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import { initialState, interaction } from "../../../state";
import FileDetail from "../../../entity/FileDetail";
import Download from "../Download";

describe("<Download />", () => {
    it("dispatches a downloadFile event", () => {
        // Arrange
        const { store, actions } = configureMockStore({ state: initialState });
        const fileDetails = new FileDetail({
            file_path: "/allen/some/path/MyFile.txt",
            file_id: "abc123",
            file_name: "MyFile.txt",
            file_size: 7,
            uploaded: "01/01/01",
            annotations: [],
        });

        const { getByLabelText } = render(
            <Provider store={store}>
                <Download fileDetails={fileDetails} />
            </Provider>
        );

        // sanity-check, no actions fired
        expect(actions.list.length).to.equal(0);

        // Act
        fireEvent.click(getByLabelText("Download file"));

        // / Assert
        expect(actions.list.length).to.equal(1);
        expect(
            actions.includesMatch({
                type: interaction.actions.DOWNLOAD_FILE,
            })
        ).to.equal(true);
    });

    it("only dispatches a single downloadFile event when clicked many times rapidly", () => {
        // Arrange
        const { store, actions } = configureMockStore({ state: initialState });
        const fileDetails = new FileDetail({
            file_path: "/allen/some/path/MyFile.txt",
            file_id: "abc123",
            file_name: "MyFile.txt",
            file_size: 7,
            uploaded: "01/01/01",
            annotations: [],
        });

        const { getByLabelText } = render(
            <Provider store={store}>
                <Download fileDetails={fileDetails} />
            </Provider>
        );

        // sanity-check, no actions fired
        expect(actions.list.length).to.equal(0);

        // Act
        for (let i = 0; i < 10; i += 1) {
            fireEvent.click(getByLabelText("Download file"));
        }

        // / Assert -- only one action fired
        expect(actions.list.length).to.equal(1);
        expect(
            actions.includesMatch({
                type: interaction.actions.DOWNLOAD_FILE,
            })
        ).to.equal(true);
    });

    it("is disabled when download is already in progress", () => {
        // Arrange
        const fileId = "abc123";
        const state = mergeState(initialState, {
            interaction: {
                status: [
                    {
                        data: {
                            fileId: [fileId],
                            msg: "Download in progress",
                        },
                        processId: "processId",
                    },
                ],
            },
        });
        const { store, actions } = configureMockStore({ state });
        const fileDetails = new FileDetail({
            file_path: "/allen/some/path/MyFile.txt",
            file_id: fileId,
            file_name: "MyFile.txt",
            file_size: 7,
            uploaded: "01/01/01",
            annotations: [],
        });

        const { getByLabelText } = render(
            <Provider store={store}>
                <Download fileDetails={fileDetails} />
            </Provider>
        );

        // sanity-check, no actions fired
        expect(actions.list.length).to.equal(0);

        // Act
        fireEvent.click(getByLabelText("Download file"));

        // / Assert -- still no actions fired
        expect(actions.list.length).to.equal(0);
    });
});
