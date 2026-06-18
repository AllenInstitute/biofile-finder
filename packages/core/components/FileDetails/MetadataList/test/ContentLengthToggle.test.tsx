import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import sinon from "sinon";

import ContentLengthToggle from "../ContentLengthToggle";

describe("<ContentLengthToggle />", () => {
    it("renders expand icon when collapsed", () => {
        const { getByTestId } = render(
            <ContentLengthToggle isCollapsed={true} setIsCollapsed={sinon.stub()} />
        );
        expect(getByTestId("expand-nested-fields")).to.exist;
    });

    it("renders collapse icon when expanded", () => {
        const { getByTestId } = render(
            <ContentLengthToggle isCollapsed={false} setIsCollapsed={sinon.stub()} />
        );
        expect(getByTestId("collapse-nested-fields")).to.exist;
    });

    it("calls setIsCollapsed with toggled value on click", () => {
        const setIsCollapsed = sinon.spy();
        const { getByTestId } = render(
            <ContentLengthToggle isCollapsed={false} setIsCollapsed={setIsCollapsed} />
        );
        fireEvent.click(getByTestId("collapse-nested-fields"));
        expect(setIsCollapsed.calledOnceWith(true)).to.be.true;
    });
});
