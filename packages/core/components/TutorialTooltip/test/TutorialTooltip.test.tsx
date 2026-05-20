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
                tutorials: [
                    new Tutorial(title)
                        .addStep({
                            targetId,
                            message: stepOneMessage,
                        })
                        .addStep({
                            targetId,
                            message: stepTwoMessage,
                        }),
                ],
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
        const targetId = "test-id-for-tutorial";

        const state = mergeState(initialState, {
            selection: {
                tutorials: [
                    new Tutorial(title).addStep({
                        targetId,
                        message: "cool tutorial for you",
                    }),
                ],
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
        expect(getByText(title)).to.exist;

        // Act
        fireEvent.click(getByTestId("base-button-tutorial-next"));

        // Assert
        expect(() => getByText(title)).to.throw();
    });

    it("pages between tutorial topics in list", () => {
        // Arrange
        const targetId = "test-id-for-tutorial";
        const title1 = "test tutorial 1";
        const topic1step1msg = "Tutorial 1 message 1";
        const topic1step2msg = "Tutorial 1 message 2";

        const title2 = "test tutorial 2";
        const topic2step1msg = "Tutorial 2 message 1";

        const state = mergeState(initialState, {
            selection: {
                tutorials: [
                    new Tutorial(title1)
                        .addStep({
                            targetId,
                            message: topic1step1msg,
                        })
                        .addStep({
                            targetId,
                            message: topic1step2msg,
                        }),
                    new Tutorial(title2).addStep({
                        targetId,
                        message: topic2step1msg,
                    }),
                ],
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
        expect(getByText(topic1step1msg)).to.exist;
        expect(() => getByText(topic1step2msg)).to.throw();
        expect(() => getByText(topic2step1msg)).to.throw();
        expect(getByText(title1)).to.exist;
        expect(() => getByText(title2)).to.throw;

        // Act: click through both topic 1 steps
        fireEvent.click(getByTestId("base-button-tutorial-next"));
        fireEvent.click(getByTestId("base-button-tutorial-next"));

        // Assert: should be in topic 2
        expect(getByText(topic2step1msg)).to.exist;
        expect(() => getByText(topic1step1msg)).to.throw();
        expect(() => getByText(topic1step2msg)).to.throw();
        expect(getByText(title2)).to.exist;
        expect(() => getByText(title1)).to.throw;

        // Act: go back to topic 1 step 2
        fireEvent.click(getByTestId("base-button-tutorial-prev"));

        // Assert
        expect(getByText(topic1step2msg)).to.exist;
        expect(() => getByText(topic2step1msg)).to.throw();
        expect(getByText(title1)).to.exist;
        expect(() => getByText(title2)).to.throw;
    });

    it("does not render when tutorial list is empty", () => {
        const state = mergeState(initialState, {
            selection: {
                tutorials: [],
            },
        });
        const { store } = configureMockStore({ state });
        const { getByTestId } = render(
            <Provider store={store}>
                <TutorialTooltip />
            </Provider>
        );
        expect(() => getByTestId("base-button-tutorial-next")).to.throw();
    });
});
