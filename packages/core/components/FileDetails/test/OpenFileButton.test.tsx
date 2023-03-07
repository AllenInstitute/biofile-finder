import { configureMockStore } from "@aics/redux-utils";
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
        const { store, actions } = configureMockStore({ state: initialState });
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

        // Assert
        expect(actions.list.length).to.equal(1);
        expect(
            actions.includesMatch({
                type: interaction.actions.OPEN_WITH_DEFAULT,
            })
        ).to.be.true;
    });
});
