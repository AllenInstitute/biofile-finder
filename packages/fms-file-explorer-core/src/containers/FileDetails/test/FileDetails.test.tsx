import { expect } from "chai";
import { mount } from "enzyme";
import * as React from "react";
import { Provider } from "react-redux";

import FileDetails, { WINDOW_ACTION_BUTTON_WIDTH } from "../";
import createMockReduxStore from "../../../state/test/mock-redux-store";

const styles = require("../FileDetails.module.css");

describe("<FileDetails />", () => {
    describe("Expand and collapse behavior", () => {
        it("expands when the maximize button is clicked", () => {
            const [store] = createMockReduxStore();
            const wrapper = mount(
                <Provider store={store}>
                    <FileDetails />
                </Provider>
            );

            // initial condition: the details window is not expanded
            expect(wrapper.find(`.${styles.expandable}`).hasClass(styles.maximized)).to.equal(
                false
            );

            // press the maximize button
            wrapper.find("[aria-label='Maximize details window']").simulate("click");

            // expected: details window is maximized
            expect(wrapper.find(`.${styles.expandable}`).hasClass(styles.maximized)).to.equal(true);
        });

        it("contracts when the minimize button is clicked", () => {
            const [store] = createMockReduxStore();
            const wrapper = mount(
                <Provider store={store}>
                    <FileDetails />
                </Provider>
            );

            const getStyleNode = () =>
                wrapper
                    .find(`.${styles.expandable}`)
                    .getDOMNode()
                    .getAttribute("style");

            // initial condition: the details window is not minimized
            expect(getStyleNode()).to.be.null;

            // press the minimize button
            wrapper.find("[aria-label='Minimize details window']").simulate("click");

            // expected: details window is minimized
            expect(getStyleNode()).to.equal(`width: ${WINDOW_ACTION_BUTTON_WIDTH}px;`);
        });

        it("resets to its default size when the reset button is clicked", () => {
            const [store] = createMockReduxStore();
            const wrapper = mount(
                <Provider store={store}>
                    <FileDetails />
                </Provider>
            );

            // initial condition: the window is maximized
            wrapper.find("[aria-label='Maximize details window']").simulate("click");
            expect(wrapper.find(`.${styles.expandable}`).hasClass(styles.maximized)).to.equal(true);
            expect(wrapper.find(`.${styles.expandable}`).hasClass(styles.default)).to.equal(false);

            // press the restore button
            wrapper.find("[aria-label='Restore details window']").simulate("click");

            // expected: details window is in its "default" state
            expect(wrapper.find(`.${styles.expandable}`).hasClass(styles.maximized)).to.equal(
                false
            );
            expect(wrapper.find(`.${styles.expandable}`).hasClass(styles.default)).to.equal(true);
        });

        it("renders minimize and maximize buttons when at its default size", () => {
            const [store] = createMockReduxStore();
            const wrapper = mount(
                <Provider store={store}>
                    <FileDetails />
                </Provider>
            );

            [
                "[aria-label='Minimize details window']",
                "[aria-label='Maximize details window']",
            ].forEach((selector) => {
                expect(wrapper.exists(selector)).to.equal(true);
            });
        });

        it("renders restore and maximize buttons when it is minimized", () => {
            const [store] = createMockReduxStore();
            const wrapper = mount(
                <Provider store={store}>
                    <FileDetails />
                </Provider>
            );

            // setup: minimize the details pane
            wrapper.find("[aria-label='Minimize details window']").simulate("click");

            [
                "[aria-label='Restore details window']",
                "[aria-label='Maximize details window']",
            ].forEach((selector) => {
                expect(wrapper.exists(selector)).to.equal(true);
            });
        });

        it("renders restore and minimize buttons when it is maximized", () => {
            const [store] = createMockReduxStore();
            const wrapper = mount(
                <Provider store={store}>
                    <FileDetails />
                </Provider>
            );

            // setup: maximize the details pane
            wrapper.find("[aria-label='Maximize details window']").simulate("click");

            [
                "[aria-label='Minimize details window']",
                "[aria-label='Restore details window']",
            ].forEach((selector) => {
                expect(wrapper.exists(selector)).to.equal(true);
            });
        });
    });
});
