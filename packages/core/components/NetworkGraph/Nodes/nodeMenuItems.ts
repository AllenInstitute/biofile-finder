import { Dispatch } from "redux";

import FileDetail from "../../../entity/FileDetail";
import Graph from "../../../entity/Graph";
import { interaction } from "../../../state";

/**
 * Button options shared across nodes
 */
export default (dispatch: Dispatch, graph: Graph, nodeId: string, fileToSearch?: FileDetail) => [
    {
        key: "organize",
        text: "Organize",
        subMenuProps: {
            items: [
                {
                    key: "grid",
                    text: "Grid",
                    onClick: () => {
                        graph.organize(nodeId, "grid");
                        dispatch(interaction.actions.refreshGraph());
                    },
                },
                {
                    key: "stack",
                    text: "Stack",
                    onClick: () => {
                        graph.organize(nodeId, "stack");
                        dispatch(interaction.actions.refreshGraph());
                    },
                },
                {
                    key: "graph",
                    text: "Graph (Default)",
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
