import { DefaultButton, IContextualMenuItem } from "@fluentui/react";
import { getBezierPath, EdgeLabelRenderer, BaseEdge, EdgeProps, Edge } from "@xyflow/react";
import React, { FC } from "react";
import { useSelector } from "react-redux";

import { useButtonMenu } from "../../Buttons";
import MarkdownText from "../../MarkdownText";
import Tooltip from "../../Tooltip";
import FileFilter from "../../../entity/FileFilter";
import IncludeFilter from "../../../entity/FileFilter/IncludeFilter";
import { AnnotationEdge } from "../../../entity/Graph";
import SearchParams from "../../../entity/SearchParams";
import { selection } from "../../../state";

import styles from "./DefaultEdge.module.css";

// Returns a customizable edge in a ReactFlow network graph
const DefaultEdge: FC<EdgeProps<Edge<AnnotationEdge>>> = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
}) => {
    const annotationValue = data ? `${data.value}` : "";
    const currentQuery = useSelector(selection.selectors.getCurrentQueryParts);
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

    const buttonMenuItems: IContextualMenuItem[] = [
        {
            key: "Open files from this process as new query",
            text: "Open files from this process as new query",
            onClick: () => {
                if (!data) return;
                let newUrl;
                if (data.name) {
                    newUrl = SearchParams.encode({
                        ...currentQuery,
                        hierarchy: [],
                        filters: [new FileFilter(data.name, annotationValue)],
                        provOriginId: undefined,
                    });
                } else {
                    newUrl = SearchParams.encode({
                        ...currentQuery,
                        hierarchy: [],
                        filters: [new IncludeFilter(data.parent), new IncludeFilter(data.child)],
                        provOriginId: undefined,
                    });
                }
                window.open(`/app?${newUrl}`, "_blank");
            },
        },
    ];

    const indexOfLinkStart = annotationValue.indexOf("(");
    const indexOfLinkEnd = annotationValue.indexOf(")");
    const indexOfLinkLabelStart = annotationValue.indexOf("[");
    const indexOfLinkLabelEnd = annotationValue.indexOf("]");
    if (
        indexOfLinkLabelStart < indexOfLinkLabelEnd &&
        indexOfLinkLabelEnd < indexOfLinkStart &&
        indexOfLinkStart < indexOfLinkEnd
    ) {
        const link = annotationValue.substring(indexOfLinkStart + 1, indexOfLinkEnd);
        buttonMenuItems.unshift({
            key: "open-provided-link",
            text: "Open provided link",
            iconName: "OpenInNewWindow",
            onClick: () => {
                window.open(link, "_blank", "noopener,noreferrer");
            },
        });
    }
    const buttonMenu = useButtonMenu({
        items: buttonMenuItems,
    });

    const tooltip = data?.name ? `${data.name}: ${data.value}` : data?.value;
    // Uses the default edge component, but allows us to apply styling or hyperlinks and change the location of the label
    return (
        <>
            <BaseEdge className={styles.path} id={id} path={edgePath} />
            <EdgeLabelRenderer>
                <DefaultButton
                    className={`edge-label-renderer__custom-edge nodrag nopan ${styles.edge}`}
                    menuProps={buttonMenu}
                    style={{
                        transform: `translate(0%, -50%) translate(${labelX}px,${labelY}px)`,
                    }}
                >
                    <Tooltip content={tooltip}>
                        <MarkdownText text={data?.value} />
                    </Tooltip>
                </DefaultButton>
            </EdgeLabelRenderer>
        </>
    );
};

export default DefaultEdge;
