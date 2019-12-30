import * as React from "react";

import LazyWindowedFileList from "../LazyWindowedFileList";
import { FileSetTreeNode } from "./selectors";
import { ColumnWidths } from "./useResizableColumns";
import Annotation from "../../entity/Annotation";

interface RowProps {
    data: {
        columnWidths: ColumnWidths;
        displayAnnotations: Annotation[];
        fileSetTree: Map<number, FileSetTreeNode>;
        isOpen: (index: number) => boolean;
        onClick: (index: number) => void;
        rowWidth: number;
    };
    index: number; // injected by react-window
    style: React.CSSProperties; // injected by react-window
}

export default function Row({ data, index, style }: RowProps) {
    const { columnWidths, displayAnnotations, fileSetTree, isOpen, onClick, rowWidth } = data;
    const node = fileSetTree.get(index);
    return (
        <div
            onClick={() => onClick(index)}
            style={Object.assign({}, style, { display: "flex", flexDirection: "column" })}
        >
            {node ? node.dir : null}
            {node && node.fileSet && isOpen(index) ? (
                <LazyWindowedFileList
                    key={node.fileSet.toQueryString()}
                    collapsed={false}
                    columnWidths={columnWidths}
                    displayAnnotations={displayAnnotations}
                    fileSet={node.fileSet}
                    level={node.depth}
                    rowWidth={rowWidth}
                />
            ) : null}
        </div>
    );
}
