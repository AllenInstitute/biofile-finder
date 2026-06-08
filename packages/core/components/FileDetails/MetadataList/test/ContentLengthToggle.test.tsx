import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import sinon from "sinon";

import ContentLengthToggle from "../ContentLengthToggle";

describe("<ContentLengthToggle />", () => {
    it("renders expand icon when collapsed", () => {
        const { getByTestId } = render(
            <ContentLengthToggle isExpanded={false} setIsExpanded={sinon.stub()} />
        );
        expect(getByTestId("expand-nested-fields")).to.exist;
    });

    it("renders collapse icon when expanded", () => {
        const { getByTestId } = render(
            <ContentLengthToggle isExpanded={true} setIsExpanded={sinon.stub()} />
        );
        expect(getByTestId("collapse-nested-fields")).to.exist;
    });

    it("calls setIsExpanded with toggled value on click", () => {
        const setIsExpanded = sinon.spy();
        const { getByTestId } = render(
            <ContentLengthToggle isExpanded={false} setIsExpanded={setIsExpanded} />
        );
        fireEvent.click(getByTestId("expand-nested-fields"));
        expect(setIsExpanded.calledOnceWith(true)).to.be.true;
    });
});
