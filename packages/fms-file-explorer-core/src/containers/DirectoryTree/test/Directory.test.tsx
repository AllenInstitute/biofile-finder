import { expect } from "chai";
import { shallow } from "enzyme";
import * as React from "react";

import Directory from "../Directory";
import Annotation from "../../../entity/Annotation";
import { annotationsJson } from "../../../entity/Annotation/mocks";
import { ColumnWidths } from "../useResizableColumns";
import FileSet from "../../../entity/FileSet";
import { FileSetTree } from "../selectors";

const styles = require("../Directory.module.css");

describe("<Directory />", () => {
    const annotationsToDisplay = annotationsJson.map((annotation) => new Annotation(annotation));
    const rowWidth = 1000;
    const columnWidths = new ColumnWidths(
        rowWidth,
        annotationsToDisplay.map((annotation) => annotation.displayName)
    );

    describe("smoke test", () => {
        it("renders directory names and a fileset", () => {
            const subTree: FileSetTree = ["bar", [new FileSet()]];
            const fileSetTree: FileSetTree = ["foo", [subTree]];

            const wrapper = shallow(
                <Directory
                    columnWidths={columnWidths}
                    displayAnnotations={annotationsToDisplay}
                    level={0}
                    rowWidth={rowWidth}
                    fileSetTree={fileSetTree}
                />
            );

            expect(wrapper.contains("foo")).to.equal(true);

            expect(
                wrapper.containsMatchingElement(
                    <Directory
                        columnWidths={columnWidths}
                        displayAnnotations={annotationsToDisplay}
                        level={1}
                        rowWidth={rowWidth}
                        fileSetTree={subTree}
                    />
                )
            ).to.equal(true);
        });
    });

    describe("collapse behavior", () => {
        it("collapses subdirectories", () => {
            const subTree: FileSetTree = ["bar", [new FileSet()]];
            const fileSetTree: FileSetTree = ["foo", [subTree]];

            const wrapper = shallow(
                <Directory
                    columnWidths={columnWidths}
                    displayAnnotations={annotationsToDisplay}
                    level={0}
                    rowWidth={rowWidth}
                    fileSetTree={fileSetTree}
                />
            );

            const subDirectory = (
                <Directory
                    columnWidths={columnWidths}
                    displayAnnotations={annotationsToDisplay}
                    level={1}
                    rowWidth={rowWidth}
                    fileSetTree={subTree}
                />
            );

            // before, directories should not be collapsed
            expect(wrapper.containsMatchingElement(subDirectory)).to.equal(true);

            // click the element that toggles collapse and assert that subdirectory is no longer rendered
            wrapper
                .find(`.${styles.directoryContainer}`)
                .first()
                .simulate("click");
            expect(wrapper.containsMatchingElement(subDirectory)).to.equal(false);

            // for good measure, test that we can uncollapse it
            wrapper
                .find(`.${styles.directoryContainer}`)
                .first()
                .simulate("click");
            expect(wrapper.containsMatchingElement(subDirectory)).to.equal(true);
        });
    });
});
