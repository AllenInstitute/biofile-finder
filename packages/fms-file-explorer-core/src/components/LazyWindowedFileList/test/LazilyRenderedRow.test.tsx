import { expect } from "chai";
import { mount } from "enzyme";
import * as React from "react";

import Annotation from "../../../entity/Annotation";
import { ColumnWidths } from "../../../containers/FileList/useResizableColumns";
import LazilyRenderedRow from "../LazilyRenderedRow";
import { FmsFile } from "../useFileFetcher";

describe("<LazilyRenderedRow />", () => {
    function makeItemData() {
        const files = new Map<number, FmsFile>();
        files.set(3, { file_id: "abc123", file_index: 3, file_name: "my_image.czi" }); // eslint-disable-line @typescript-eslint/camelcase

        const rowWidth = 100;

        return {
            columnWidths: new ColumnWidths(rowWidth, ["file_name"]),
            displayAnnotations: [
                new Annotation({
                    annotation_display_name: "Name", // eslint-disable-line @typescript-eslint/camelcase
                    annotation_name: "file_name", // eslint-disable-line @typescript-eslint/camelcase
                    description: "name of file",
                    type: "string",
                }),
            ],
            level: 0,
            files,
            rowWidth,
        };
    }

    it("renders data when it's available", () => {
        const wrapper = mount(<LazilyRenderedRow data={makeItemData()} index={3} style={{}} />);

        const expectedTextNode = "my_image.czi";
        expect(wrapper.contains(expectedTextNode)).to.equal(true);
    });

    it("renders a loading indicator when data is not available", () => {
        const wrapper = mount(<LazilyRenderedRow data={makeItemData()} index={23} style={{}} />);

        const expectedTextNode = "Loading...";
        expect(wrapper.contains(expectedTextNode)).to.equal(true);
    });
});
