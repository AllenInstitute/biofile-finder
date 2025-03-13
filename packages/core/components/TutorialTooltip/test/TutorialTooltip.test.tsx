import { configureMockStore, mergeState } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import TutorialTooltip from "..";
import Tutorial from "../../../entity/Tutorial";
import { initialState, reducer, reduxLogics } from "../../../state";

describe("<TutorialTooltip />", () => {
    it("pages through tutorial steps", () => {
        // Arrange
        const title = "test tutorial";
        const targetId = "test-id-for-tutorial";
        const stepOneMessage = "my first message";
        const stepTwoMessage = "my second message";

        const state = mergeState(initialState, {
            selection: {
                tutorial: new Tutorial(title)
                    .addStep({
                        targetId,
                        message: stepOneMessage,
                    })
                    .addStep({
                        targetId,
                        message: stepTwoMessage,
                    }),
            },
        });
        const { store } = configureMockStore({ state });
        const { getByText, getByTestId } = render(
            <Provider store={store}>
                <div id={targetId} />
                <TutorialTooltip />
            </Provider>
        );

        // (sanity-check)
        expect(getByText(stepOneMessage)).to.exist;
        expect(() => getByText(stepTwoMessage)).to.throw();

        // Act
        fireEvent.click(getByTestId("base-button-tutorial-next"));

        // Assert
        expect(getByText(stepTwoMessage)).to.exist;
        expect(() => getByText(stepOneMessage)).to.throw();

        // Act
        fireEvent.click(getByTestId("base-button-tutorial-prev"));

        // Assert
        expect(getByText(stepOneMessage)).to.exist;
        expect(() => getByText(stepTwoMessage)).to.throw();
    });

    it("closes at end of tutorial", () => {
        // Arrange
        const title = "My Tutorial";
        const formattedTutorial = `Tutorial: ${title}`;
        const targetId = "test-id-for-tutorial";

        const state = mergeState(initialState, {
            selection: {
                tutorial: new Tutorial(title).addStep({
                    targetId,
                    message: "cool tutorial for you",
                }),
            },
        });
        const { store } = configureMockStore({
            logics: reduxLogics,
            state,
            reducer,
        });
        const { getByText, getByTestId } = render(
            <Provider store={store}>
                <div id={targetId} />
                <TutorialTooltip />
            </Provider>
        );

        // (sanity-check)
        expect(getByText(formattedTutorial)).to.exist;

        // Act
        fireEvent.click(getByTestId("base-button-tutorial-next"));

        // Assert
        expect(() => getByText(formattedTutorial)).to.throw();
    });
});
