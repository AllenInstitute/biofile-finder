import { expect } from "chai";
import { shallow } from "enzyme";
import * as React from "react";

import FlexLayout from "../";

describe("<FlexLayout />", () => {
    it("displays as flex when flexParent is true", () => {
        const wrapper = shallow(<FlexLayout flexParent={true} />);
        expect(wrapper.prop("style")).to.include({ display: "flex" });
    });

    it("does not display as flex when flexParent is false", () => {
        const wrapper = shallow(<FlexLayout flexParent={false} />);
        expect(wrapper.prop("style")).to.not.include({ display: "flex" });
    });
});
