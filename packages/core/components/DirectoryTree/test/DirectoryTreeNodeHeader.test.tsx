import { configureMockStore } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import { noop } from "lodash";
import * as React from "react";
import { Provider } from "react-redux";
import { createSandbox } from "sinon";

import annotationFormatterFactory, { AnnotationType } from "../../../entity/AnnotationFormatter";
import FileSet from "../../../entity/FileSet";
import * as useLayoutMeasurements from "../../../hooks/useLayoutMeasurements";
import { initialState } from "../../../state";

import DirectoryTreeNodeHeader from "../DirectoryTreeNodeHeader";

describe("<DirectoryTreeNodeHeader />", () => {
    // Arrange
    const { store } = configureMockStore({ state: initialState });
    const sandbox = createSandbox();
    const fileSet = new FileSet();
    const ref = { current: null };

    beforeEach(() => {
        // Virtual screen size
        sandbox.stub(useLayoutMeasurements, "default").callsFake(() => [ref, 1000, 1000]);
    });

    afterEach(function () {
        sandbox.restore();
    });

    function DirectoryTreeNodeHeaderFactory(title: string) {
        return (
            <DirectoryTreeNodeHeader
                collapsed={true}
                error={null}
                fileSet={fileSet}
                isLeaf={false}
                isFocused={false}
                loading={false}
                onClick={() => noop}
                title={title}
            />
        );
    }

    it("truncates long folder names", async () => {
        const longTitle = "This string contains 36 characters. ".repeat(10).trim();

        const { getByText, queryByText } = render(
            <Provider store={store}>{DirectoryTreeNodeHeaderFactory(longTitle)}</Provider>
        );
        expect(getByText(/\.\.\./)).to.exist;
        // Shouldn't be able to find full string
        expect(queryByText(longTitle)).not.to.exist;
    });

    it("doesn't truncate short folder names", async () => {
        const { store } = configureMockStore({ state: initialState });
        const shortTitle = "A much shorter string";

        const { getByText, queryByText } = render(
            <Provider store={store}>{DirectoryTreeNodeHeaderFactory(shortTitle)}</Provider>
        );
        expect(queryByText(/\.\.\./)).not.to.exist;
        expect(getByText(shortTitle)).to.exist;
    });

    it("truncates short folder names when screen is small", async () => {
        const { store } = configureMockStore({ state: initialState });
        const shortTitle = "A much shorter string";
        sandbox.restore();
        sandbox.stub(useLayoutMeasurements, "default").callsFake(() => [ref, 10, 10]);

        const { getByText, queryByText } = render(
            <Provider store={store}>{DirectoryTreeNodeHeaderFactory(shortTitle)}</Provider>
        );
        expect(getByText(/\.\.\./)).to.exist;
        expect(queryByText(shortTitle)).not.to.exist;
    });

    // Catch for bug where couldn't slice title for "0" group
    it("handles zero duration type folder names", async () => {
        const { store } = configureMockStore({ state: initialState });
        const durationFormatter = annotationFormatterFactory(AnnotationType.DURATION);
        const durationDisplayValue = durationFormatter.displayValue(0);

        const { getByText, queryByText } = render(
            <Provider store={store}>
                {DirectoryTreeNodeHeaderFactory(durationDisplayValue)}
            </Provider>
        );
        expect(queryByText(/\.\.\./)).not.to.exist;
        expect(getByText("0S")).to.exist;
    });

    describe("handles boolean type folder names", () => {
        const { store } = configureMockStore({ state: initialState });
        const booleanFormatter = annotationFormatterFactory(AnnotationType.BOOLEAN);
        it("handles true values", async () => {
            const trueDisplayValue = booleanFormatter.displayValue(true);
            const { getByText, queryByText } = render(
                <Provider store={store}>
                    {DirectoryTreeNodeHeaderFactory(trueDisplayValue)}
                </Provider>
            );
            expect(queryByText(/\.\.\./)).not.to.exist;
            expect(getByText("True")).to.exist;
        });
        it("handles false values", async () => {
            const falseDisplayValue = booleanFormatter.displayValue(false);
            const { getByText, queryByText } = render(
                <Provider store={store}>
                    {DirectoryTreeNodeHeaderFactory(falseDisplayValue)}
                </Provider>
            );
            expect(queryByText(/\.\.\./)).not.to.exist;
            expect(getByText("False")).to.exist;
        });
    });
});
