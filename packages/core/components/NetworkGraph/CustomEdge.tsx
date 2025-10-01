import React, { FC } from "react";
import {
    getBezierPath,
    EdgeLabelRenderer,
    BaseEdge,
    EdgeProps,
    Edge,
    MarkerType,
} from "@xyflow/react";

import styles from "./CustomEdge.module.css";

const CustomEdge: FC<EdgeProps<Edge<{ label: string; endLabel: string }>>> = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
}) => {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });
    return (
        <>
            <BaseEdge id={id} path={edgePath} markerEnd={MarkerType.ArrowClosed} />
            <EdgeLabelRenderer>
                <div
                    style={{
                        transform: `translate(0%, -50%) translate(${labelX}px,${labelY}px)`,
                    }}
                    className={`edge-label-renderer__custom-edge nodrag nopan ${styles.customEdge}`}
                >
                    <i>{data?.label}</i>
                </div>
            </EdgeLabelRenderer>
        </>
    );
};

export default CustomEdge;
