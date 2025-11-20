import { DefaultButton, IContextualMenuItem } from "@fluentui/react";
import {
    getBezierPath,
    EdgeLabelRenderer,
    BaseEdge,
    EdgeProps,
    Edge,
} from "@xyflow/react";
import Markdown from "markdown-to-jsx";
import React, { FC } from "react";
import { useDispatch } from "react-redux";

import { useButtonMenu } from "../../Buttons";
import { interaction, selection } from "../../../state";

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
    const dispatch = useDispatch();
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
            // TODO: There has to be a better way to say this
            key: "Open query for all files processed with this process",
            text: "Open query for all files processed with this process",
            onClick: () => {
                // TODO
                dispatch(selection.actions.addQuery({
                    name: `Files processed by ${data?.label}`,
                    parts: {
                        // TODO: Have to account for ancestors?????
                        // filters: [new FileFilter()]
                    }
                }));
                dispatch(interaction.actions.setOriginForProvenance());
            }
        },
    ];

    const indexOfLinkStart = data?.label ? data.label.indexOf("(") : 0;
    const indexOfLinkEnd = data?.label ? data.label.indexOf(")") : 0;
    const indexOfLinkLabelStart = data?.label ? data.label.indexOf("[") : 0;
    const indexOfLinkLabelEnd = data?.label ? data.label.indexOf("]") : 0;
    if (indexOfLinkStart > indexOfLinkLabelStart
        && indexOfLinkEnd > indexOfLinkLabelEnd 
        && indexOfLinkEnd > indexOfLinkStart) {
        const link = data?.label.substring(indexOfLinkStart + 1, indexOfLinkEnd);
        buttonMenuItems.unshift({
            key: "open-provided-link",
            text: "Open provided link",
            iconName: "OpenInNewWindow",
            onClick: () => {
                window.open(link, "_blank", "noopener,noreferrer");
            }
        });
    }
    const buttonMenu = useButtonMenu({
        items: buttonMenuItems
    });

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
                </DefaultButton>
            </EdgeLabelRenderer>
        </>
    );
};

export default DefaultEdge;
