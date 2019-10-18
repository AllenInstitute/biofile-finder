import { expect } from "chai";
import { shallow } from "enzyme";
import { omit } from "lodash";
import * as React from "react";

import { FmsFile } from "../../../hooks/useFileFetcher";

import FileRow from "../";

describe("<FileRow />", () => {
    let data: Map<number, FmsFile>;

    beforeEach(() => {
        data = new Map<number, FmsFile>();
        data.set(3, { file_id: "abc123", file_index: 3 }); // eslint-disable-line @typescript-eslint/camelcase
    });

    it("renders data when it's available", () => {
        const wrapper = shallow(<FileRow data={data} index={3} style={{}} />);

        const expectedTextNode = JSON.stringify(omit(data.get(3), "file_index"));
        expect(wrapper.contains(expectedTextNode)).to.equal(true);
    });

    it("renders a loading indicator when data is not available", () => {
        const wrapper = shallow(<FileRow data={data} index={23} style={{}} />);

        const expectedTextNode = "Loading...";
        expect(wrapper.contains(expectedTextNode)).to.equal(true);
    });
});
