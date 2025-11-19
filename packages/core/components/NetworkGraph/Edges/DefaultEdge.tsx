import {
    getBezierPath,
    EdgeLabelRenderer,
    BaseEdge,
    EdgeProps,
    Edge,
} from "@xyflow/react";
import Markdown from "markdown-to-jsx";
import React, { FC } from "react";

import styles from "./DefaultEdge.module.css";

// Returns a customizable edge in a ReactFlow network graph
const DefaultEdge: FC<EdgeProps<Edge<{ label: string; endLabel: string }>>> = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
}) => {
    /**
     *  External util from reactflow that returns a "bezier" type path between two nodes
     *
     *  Inputs: The x and y coordinates for the source and target nodes,
     *  and the position of the edge connectors to use relative to each node (e.g., top, bottom, left, right)
     *
     *  @returns a fully described edge
     *  - `edgePath`: string describing the path to use in the SVG `<path>` element
     *  - `labelX`, `labelY`: the x, y default location for the edge's label
     */
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    // Uses the default edge component, but allows us to apply styling or hyperlinks and change the location of the label
    return (
        <>
            <BaseEdge id={id} path={edgePath} />
            <EdgeLabelRenderer>
                <div
                    style={{
                        transform: `translate(0%, -50%) translate(${labelX}px,${labelY}px)`,
                    }}
                    className={`edge-label-renderer__custom-edge nodrag nopan ${styles.customEdge}`}
                >
                    {/* Safely render markdown using external library */}
                    <i>
                        <Markdown
                            options={{
                                overrides: {
                                    a: {
                                        props: {
                                            target: "_blank",
                                            rel: "noopener noreferrer",
                                        },
                                    },
                                },
                            }}
                        >
                            {data?.label}
                        </Markdown>
                    </i>
                </div>
            </EdgeLabelRenderer>
        </>
    );
};

export default DefaultEdge;
