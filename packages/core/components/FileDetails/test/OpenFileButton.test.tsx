import { configureMockStore, mergeState } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import { initialState, interaction } from "../../../state";
import FileDetail from "../../../entity/FileDetail";

import OpenFileButton from "../OpenFileButton";

describe("<OpenFileButton />", () => {
    it("opens file in app", () => {
        // Arrange
        const appName = "MyApp";
        const appPath = `/home/some/path/${appName}.exe`;
        const state = mergeState(initialState, {
            interaction: {
                userSelectedApplications: [
                    {
                        defaultFileKinds: [],
                        filePath: appPath,
                    },
                ],
            },
        });
        const { store, actions } = configureMockStore({ state });
        const fileDetails = new FileDetail({
            file_path: "/allen/some/path/MyFile.txt",
            file_id: "abc123",
            file_name: "MyFile.txt",
            file_size: 7,
            uploaded: "01/01/01",
            annotations: [],
        });

        const { getByText } = render(
            <Provider store={store}>
                <OpenFileButton fileDetails={fileDetails} />
            </Provider>
        );

        // (sanity-check) no actions fired
        expect(actions.list.length).to.equal(0);

        // Act
        fireEvent.click(getByText("Open"));
        // Execution service will attempt to find name however we have the Noop service
        // in place so it will just return this for any request for a file name
        fireEvent.click(getByText("ExecutionEnvServiceNoop::getFilename"));

        // Assert
        expect(actions.list.length).to.equal(1);
        expect(
            actions.includesMatch({
                type: interaction.actions.OPEN_WITH,
            })
        ).to.be.true;
    });
});
