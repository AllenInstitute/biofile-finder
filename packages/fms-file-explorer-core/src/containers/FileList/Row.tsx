import * as React from "react";

import LazyWindowedFileList from "../LazyWindowedFileList";
import { FileSetTreeNode } from "./selectors";

interface RowProps {
    data: {
        fileSetTree: Map<number, FileSetTreeNode>;
        isOpen: (index: number) => boolean;
        onClick: (index: number) => void;
    };
    index: number; // injected by react-window
    style: React.CSSProperties; // injected by react-window
}

export default function Row({ data, index, style }: RowProps) {
    const { fileSetTree, isOpen, onClick } = data;
    const node = fileSetTree.get(index);

    if (!node) {
        return null;
    }

    return (
        <div
            onClick={() => onClick(index)}
            style={Object.assign({}, style, {
                display: "flex",
                flexDirection: "column",
                paddingLeft: `${node.depth * 10}px`,
            })}
        >
            {node.dir}
            {node.fileSet && isOpen(index) ? (
                <LazyWindowedFileList
                    key={node.fileSet.toQueryString()}
                    collapsed={false}
                    fileSet={node.fileSet}
                    level={node.depth}
                />
            ) : null}
        </div>
    );
}
