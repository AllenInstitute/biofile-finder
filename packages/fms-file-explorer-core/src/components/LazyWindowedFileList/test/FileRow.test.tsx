import { expect } from "chai";
import { shallow } from "enzyme";
import { omit } from "lodash";
import * as React from "react";

import { FmsFile } from "../../LazyWindowedFileList/useFileFetcher";

import FileRow from "../FileRow";

describe("<FileRow />", () => {
    let files: Map<number, FmsFile>;

    beforeEach(() => {
        files = new Map<number, FmsFile>();
        files.set(3, { file_id: "abc123", file_index: 3 }); // eslint-disable-line @typescript-eslint/camelcase
    });

    it("renders data when it's available", () => {
        const wrapper = shallow(<FileRow data={{ level: 0, files }} index={3} style={{}} />);

        const expectedTextNode = JSON.stringify(omit(files.get(3), "file_index"));
        expect(wrapper.contains(expectedTextNode)).to.equal(true);
    });

    it("renders a loading indicator when data is not available", () => {
        const wrapper = shallow(<FileRow data={{ level: 0, files }} index={23} style={{}} />);

        const expectedTextNode = "Loading...";
        expect(wrapper.contains(expectedTextNode)).to.equal(true);
    });
});
