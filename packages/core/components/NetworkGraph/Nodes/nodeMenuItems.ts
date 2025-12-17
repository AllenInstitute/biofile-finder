import { Dispatch } from "redux";

import FileDetail from "../../../entity/FileDetail";
import Graph from "../../../entity/Graph";
import { interaction } from "../../../state";

/**
 * Button options shared across nodes
 */
export default (
    dispatch: Dispatch,
    graph: Graph,
    nodeId: string,
    fileToSearch?: FileDetail,
    canOrganizeAsGrid?: boolean
) => [
    {
        key: "organize",
        text: "Organize",
        title: "Organize the children of this node by one of the following layout options",
        subMenuProps: {
            items: [
                {
                    key: "compact",
                    text: "Compact",
                    title: "Formats children into a stack for compact viewing",
                    onClick: () => {
                        graph.organize(nodeId, "compact");
                        dispatch(interaction.actions.refreshGraph());
                    },
                },
                {
                    key: "grid",
                    text: "Grid (alphanumeric)",
                    disabled: !canOrganizeAsGrid,
                    title: canOrganizeAsGrid
                        ? "Unable to organize into grid pattern when node values aren't alphanumeric compatible (ex. 'A1' where A is the column and 1 is the row)"
                        : "Formats children into a grid pattern using alphanumeric ordering (ex. A1 where A is a column and 1 is a row)",
                    onClick: () => {
                        graph.organize(nodeId, "grid");
                        dispatch(interaction.actions.refreshGraph());
                    },
                },
                {
                    key: "graph",
                    text: "Graph (Default)",
                    title: "Formats children into the original layout",
                    onClick: () => {
                        graph.organize(nodeId, "graph");
                        dispatch(interaction.actions.refreshGraph());
                    },
                },
            ],
        },
    },
    {
        key: "check-for-more-relationships",
        text: "Check for more relationships",
        title: graph.hasMoreToSearch ? undefined : "All relationships have been checked",
        disabled: !graph.hasMoreToSearch,
        onClick: () => {
            fileToSearch && dispatch(interaction.actions.expandGraph(fileToSearch));
        },
    },
];
