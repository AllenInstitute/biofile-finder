import { expect } from "chai";
import { shallow } from "enzyme";
import * as React from "react";

import DirectoryTreeNode from "../DirectoryTreeNode";
import FileSet from "../../../entity/FileSet";
import { TreeNode } from "../useDirectoryTree";

describe("<DirectoryTreeNode />", () => {
    it("renders a directory header when not the root node", () => {
        const directoryTree: [number, TreeNode][] = [
            [0, { depth: 0, isLeaf: false, isRoot: false, fileSet: new FileSet() }],
        ];

        const wrapper = shallow(
            <DirectoryTreeNode
                data={{
                    directoryTree: new Map<number, TreeNode>(directoryTree),
                    onClick: () => {
                        /* noop */
                    },
                }}
                index={0}
                style={{}}
            />
        );

        expect(wrapper.find("h4").text()).to.equal("foo");
    });

    it("does not render a directory header when rendering the 'root'", () => {
        const directoryTree: [number, TreeNode][] = [
            [
                0,
                {
                    depth: 0,
                    fileSet: new FileSet(),
                    isRoot: true,
                },
            ],
        ];

        const wrapper = shallow(
            <DirectoryTreeNode
                data={{
                    directoryTree: new Map<number, TreeNode>(directoryTree),
                    onClick: () => {
                        /* noop */
                    },
                }}
                index={0}
                style={{}}
            />
        );

        expect(wrapper.find("h4").length).to.equal(0);
    });
});
