import { expect } from "chai";
import { shallow } from "enzyme";
import { get as _get } from "lodash";
import * as React from "react";

import Annotation from "../../../entity/Annotation";

import FileRow from "../FileRow";
import { FmsFile } from "../useFileFetcher";

describe("<FileRow />", () => {
    const annotations = [
        new Annotation({
            annotation_display_name: "Name", // eslint-disable-line @typescript-eslint/camelcase
            annotation_name: "file_name", // eslint-disable-line @typescript-eslint/camelcase
            description: "name of file",
            type: "string",
        }),
    ];
    let files: Map<number, FmsFile>;

    beforeEach(() => {
        files = new Map<number, FmsFile>();
        files.set(3, { file_id: "abc123", file_index: 3, file_name: "my_image.czi" }); // eslint-disable-line @typescript-eslint/camelcase
    });

    it("renders data when it's available", () => {
        const wrapper = shallow(
            <FileRow
                data={{ displayAnnotations: annotations, level: 0, files }}
                index={3}
                style={{}}
            />
        );

        const expectedTextNode = _get(files.get(3), "file_name");
        expect(wrapper.contains(expectedTextNode)).to.equal(true);
    });

    it("renders a loading indicator when data is not available", () => {
        const wrapper = shallow(
            <FileRow
                data={{ displayAnnotations: annotations, level: 0, files }}
                index={23}
                style={{}}
            />
        );

        const expectedTextNode = "Loading...";
        expect(wrapper.contains(expectedTextNode)).to.equal(true);
    });
});
