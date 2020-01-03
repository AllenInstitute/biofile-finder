import { expect } from "chai";
import { shallow } from "enzyme";
import * as React from "react";

import DirectoryTreeNode from "../DirectoryTreeNode";
import FileSet from "../../../entity/FileSet";
import { TreeNode } from "../selectors";

describe("<DirectoryTreeNode />", () => {
    it("renders a directory header when not the root node", () => {
        const directoryTree: [number, TreeNode][] = [
            [0, { depth: 0, dir: "foo", isLeaf: false, isRoot: false, parent: null }],
        ];

        const wrapper = shallow(
            <DirectoryTreeNode
                data={{
                    directoryTree: new Map<number, TreeNode>(directoryTree),
                    isCollapsed: () => false,
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

    it("renders nothing when its parent is collapsed", () => {
        const directoryTree: [number, TreeNode][] = [
            [0, { depth: 0, dir: "foo", isLeaf: false, isRoot: false, parent: null }],
            [1, { depth: 1, dir: "bar", isLeaf: false, isRoot: false, parent: 0 }],
        ];

        const wrapper = shallow(
            <DirectoryTreeNode
                data={{
                    directoryTree: new Map<number, TreeNode>(directoryTree),
                    isCollapsed: (index: number | null) => {
                        if (index === 0) {
                            return true;
                        }

                        return false;
                    },
                    onClick: () => {
                        /* noop */
                    },
                }}
                index={1}
                style={{}}
            />
        );

        expect(wrapper.isEmptyRender()).to.equal(true);
    });

    it("does not render a directory header when rendering the 'root'", () => {
        const directoryTree: [number, TreeNode][] = [
            [
                0,
                {
                    depth: 0,
                    dir: null,
                    fileSet: new FileSet(),
                    isLeaf: true,
                    isRoot: true,
                    parent: null,
                },
            ],
        ];

        const wrapper = shallow(
            <DirectoryTreeNode
                data={{
                    directoryTree: new Map<number, TreeNode>(directoryTree),
                    isCollapsed: () => false,
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
