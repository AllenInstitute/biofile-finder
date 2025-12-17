import FileDetail from "../../../entity/FileDetail";
import Graph from "../../../entity/Graph";

/**
 * Button options shared across nodes
 */
export default (graph: Graph, nodeId: string, fileToSearch?: FileDetail) => [
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
                    },
                },
                {
                    key: "stack",
                    text: "Stack",
                    onClick: () => {
                        graph.organize(nodeId, "stack");
                    },
                },
                {
                    key: "graph",
                    text: "Graph (Default)",
                    onClick: () => {
                        graph.organize(nodeId, "graph");
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
            fileToSearch && graph.originate(fileToSearch);
        },
    },
];
