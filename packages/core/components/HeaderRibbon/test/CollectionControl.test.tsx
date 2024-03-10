import { configureMockStore } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import { noop } from "lodash";
import * as React from "react";
import { Provider } from "react-redux";

import { Dataset } from "../../../services/DatasetService";
import { initialState, interaction, selection } from "../../../state";
import CollectionControl from "../CollectionControl";

describe("<CollectionControl />", () => {
    const EDIT_BUTTON = "edit-button";
    const EXPORT_BUTTON = "export-button";

    const mockCollection: Dataset = {
        id: "1231231",
        name: "Assay Dev's",
        version: 1,
        client: "test",
        fixed: false,
        private: true,
        query: "",
        created: new Date(),
        createdBy: "test",
    };

    it("displays 'Allen Institute FMS' as default collection", () => {
        // Arrange
        const { store } = configureMockStore({
            state: initialState,
        });
        const { getByText } = render(
            <Provider store={store}>
                <CollectionControl onCollapse={noop} />
            </Provider>
        );

        // Act / Assert
        expect(getByText("Allen Institute FMS")).to.exist;
    });

    it("disables edit and export options when no collection selected", () => {
        // Arrange
        const { store } = configureMockStore({
            state: initialState,
        });
        const { getByTestId } = render(
            <Provider store={store}>
                <CollectionControl onCollapse={noop} />
            </Provider>
        );

        // Act / Assert
        [EDIT_BUTTON, EXPORT_BUTTON].forEach((button) => {
            const element = getByTestId(button) as HTMLButtonElement;
            expect(element?.disabled).to.be.true;
        });
    });

    it("opens collection editor when edit button clicked", () => {
        // Arrange
        const { actions, store } = configureMockStore({
            state: initialState,
        });
        const { getByTestId } = render(
            <Provider store={store}>
                <CollectionControl onCollapse={noop} selectedCollection={mockCollection} />
            </Provider>
        );

        // Act
        fireEvent.click(getByTestId(EDIT_BUTTON));

        // Assert
        expect(actions.includesMatch({ type: interaction.actions.SHOW_EDIT_COLLECTION_DIALOG })).to
            .be.true;
    });

    it("opens python snippet dialog when export > python snippet clicked", () => {
        // Arrange
        const { actions, store } = configureMockStore({
            state: initialState,
        });
        const { getByTestId, getByText } = render(
            <Provider store={store}>
                <CollectionControl onCollapse={noop} selectedCollection={mockCollection} />
            </Provider>
        );

        // Act
        fireEvent.click(getByTestId(EXPORT_BUTTON));
        fireEvent.click(getByText("Python Snippet"));

        // Assert
        expect(actions.includesMatch(interaction.actions.generatePythonSnippet(mockCollection))).to
            .be.true;
    });

    it("changes collection when different selected", () => {
        // Arrange
        const { actions, store } = configureMockStore({
            state: {
                ...initialState,
                metadata: {
                    ...initialState.metadata,
                    collections: [mockCollection],
                },
            },
        });
        const { getByText } = render(
            <Provider store={store}>
                <CollectionControl onCollapse={noop} />
            </Provider>
        );

        // Act
        fireEvent.click(getByText("Allen Institute FMS"));
        fireEvent.click(getByText(mockCollection.name));

        // Assert
        expect(actions.includesMatch(selection.actions.changeCollection(mockCollection))).to.be
            .true;
    });

    it("displays private and fixed status of selected collection", () => {
        // Arrange
        const { store } = configureMockStore({
            state: {
                ...initialState,
                selection: {
                    ...initialState.selection,
                    collection: mockCollection,
                },
            },
        });
        const { getByText } = render(
            <Provider store={store}>
                <CollectionControl onCollapse={noop} />
            </Provider>
        );

        // Assert
        expect(getByText("Internal")).to.exist;
        expect(getByText("Not Frozen")).to.exist;
    });
});
