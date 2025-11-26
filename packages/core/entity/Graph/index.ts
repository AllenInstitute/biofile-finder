import dagre, { GraphEdge } from "@dagrejs/dagre";
import { Edge, Node } from "@xyflow/react";

import FileDetail from "../FileDetail";
import FileFilter from "../FileFilter";
import FileSet from "../FileSet";
import FileService, { FmsFileAnnotation } from "../../services/FileService";


export enum EdgeType {
    DEFAULT = "default",
}

export enum NodeType {
    METADATA = "metadata",
    FILE = "file"
}

interface EdgeNode {
    name: string;
    type: "file" | "metadata";
}

export interface EdgeDefinition {
    parent: EdgeNode;
    child: EdgeNode;
    relationship: string;
    relationshipType?: "pointer";
}

export interface AnnotationEdge {
    [key: string]: any;
    name?: string;
    value: string;
    child: string;
    parent: string;
}

interface ProvenanceNode extends Node {
    data: {
        isSelected: boolean;

        // Is present when the Node represents a file
        file?: FileDetail;

        // Is present when the node represents an annotation
        annotation?: FmsFileAnnotation;
    };
}

export interface MetadataNode extends ProvenanceNode {
    data: {
        annotation: FmsFileAnnotation;
        file: undefined;
        isSelected: boolean;
    };
    type: NodeType.METADATA;
}

export interface FileNode extends ProvenanceNode {
    data: {
        annotation: undefined;
        file: FileDetail;
        isSelected: boolean;
    };
    type: NodeType.FILE;
}

/**
 * Creates a node to be displayed on the metadata relationship graph.
 * The node this creates is specifically for displaying a File
 */
function createFileNode(file: FileDetail, isSelected = false): FileNode {
    return {
        id: file.id, // TODO: use row id..?
        data: {
            annotation: undefined,
            file,
            isSelected,
        },
        // Placeholder values
        position: { x: 0, y: 0 },
        type: NodeType.FILE,
    };
}

/**
 * If the edge relationship type is a "pointer"
 * we have to use the given "pointer" column to render
 * the actual value. This is useful for when a relationship
 * might exist like "Segmentation Algorithm" but have two
 * distinct values like "v1.0.0" and "v2.0.0"
 */
function createAnnotationEdge(edgeDefinition: EdgeDefinition, file: FileDetail): AnnotationEdge | undefined {
    if (edgeDefinition.relationshipType === "pointer") {
        const annotation = file.getAnnotation(edgeDefinition.relationship);
        if (!annotation) return undefined;
        return {
            name: annotation.name,
            value: `${annotation.values[0]}`,
            parent: edgeDefinition.parent.name,
            child: edgeDefinition.child.name,
        }
    }
    return {
        value: edgeDefinition.relationship,
        parent: edgeDefinition.parent.name,
        child: edgeDefinition.child.name,
    };
}

/**
 * Class entity responsible for generating the nodes and edges to be displayed
 * on a relationship graph.
 * This class takes as input:
 * * fileService: Used to query for files that may be related
 * * edgeDefinitions: Definitions of potential edge types that could be displayed;
 *   for example, parent: "Plate Barcode", child: "Well" which would be the definition for
 *   two nodes "Plate Barcode" & "Well" respectively. Additional information about the edge
 *   is captured as well, see the EdgeDefintion type for more information.
 * 
 * The main utility of this class is the generate() function will takes a file as input
 * and uses that as the origin to build the graph from.
 */
export default class Graph {
    private fileService: FileService;
    private edgeDefinitions: EdgeDefinition[];
    private childToAncestorsMap: { [child: string]: string[] };
    // Track the number of nodes generated only allowing
    // a certain number to be generated at a time
    private numberOfNodesAfforded = 75;
    private visitedNodeIds = new Set<string>();
    private graph: dagre.graphlib.Graph<FileNode | MetadataNode> = new dagre.graphlib.Graph();

    /**
     * Static method for building a map of a child node (defined by the child's name in the edge definition)
     * to all possible ancestors
     */
    private static createChildToAncestorsMap(edgeDefinitions: EdgeDefinition[]): { [child: string]: string[] } {
        // Step 1: Create map of children to their IMMEDIATE parents
        const childToParentMap = edgeDefinitions.reduce(
            (mapSoFar, edgeDefinition) => ({
                ...mapSoFar,
                [edgeDefinition.child.name]: edgeDefinition.child.name in mapSoFar
                    ? mapSoFar[edgeDefinition.child.name].add(edgeDefinition.parent.name)
                    : new Set<string>().add(edgeDefinition.parent.name)
            }),
            {} as { [child: string]: Set<string> }
        );

        // Step 2: Create recursive function for grabbing all ancestors of any given child
        const getAllAncestorsOfChild = (child: string): Set<string> => (
            new Set([
                // Get all the parents of this child
                ...(childToParentMap[child] || []),
                // ...and also all the parents of the parents of this child (recursively)
                ...[...(childToParentMap[child] || [])].flatMap((parent) => [...getAllAncestorsOfChild(parent)]),
            ])
        );

        // Step 3: Create map of children to their ancestors (including parents)
        return edgeDefinitions.reduce((mapSoFar, edgeDefinition) => ({
            ...mapSoFar,
            [edgeDefinition.child.name]: (
                mapSoFar[edgeDefinition.child.name] || [...getAllAncestorsOfChild(edgeDefinition.child.name)].sort()
            ),
        }), {} as { [child: string]: string[] });
    }

    constructor(fileService: FileService, edgeDefinitions: EdgeDefinition[]) {
        this.fileService = fileService;
        this.edgeDefinitions = edgeDefinitions;
        // Pre-compute this somewhat expensive mapping so that each metadata 
        // node doesn't have to do the work of tracing its child -> ancestors
        this.childToAncestorsMap = Graph.createChildToAncestorsMap(edgeDefinitions);
        this.reset();
    }

    /**
     * Quick getter for grabbing a list of the nodes in the graph
     */
    public get nodes(): (FileNode | MetadataNode)[] {
        return this.graph
            .nodes()
            .map(nodeId => {
                const node = this.graph.node(nodeId); // .node() is O(1)
                // Should be impossible, but just in case
                if (!node) {
                    throw new Error(
                        `An edge is pointing to a node that doesn't exist (${nodeId})`
                        + " - this is likely a bug with the graph's construction."
                    );
                }
                return node;
            });
    }

    /**
     * Quick getter for grabbing a list of the edges in the graph
     */
    public get edges(): Edge<AnnotationEdge>[] {
        return this.graph
            .edges()
            .map(edgeObj => {
                const edge = this.graph.edge(edgeObj) as GraphEdge & AnnotationEdge; // .edge() is O(1)
                // Should be impossible, but just in case
                if (!edge) {
                    throw new Error(
                        `Edge (${JSON.stringify(edgeObj)}) can't be found - it might be`
                        + " pointing to a node that doesn't exist - "
                        + " this is likely a bug with the graph's construction."
                    );
                }
                return {
                    ...edge,
                    source: edgeObj.v,
                    target: edgeObj.w,
                    data: edge,
                    id: `${edgeObj.v}-${edgeObj.w}-${edge.name}-${edge.value}`,
                }
            });
    }

    /**
     * The graph might still have nodes left to search if we had
     * on a previous run used up all the node search afforded
     */
    public get hasMoreToSearch(): boolean {
        return this.numberOfNodesAfforded <= 0;
    }

    /**
     * This function takes a file as input to use as the origin of the graph
     * and builds the relationship graph from there by querying for related
     * information.
     */
    public async originate(origin: FileDetail) {
        this.numberOfNodesAfforded += 25;
        const node = createFileNode(origin, true);
        await this.expand(node);
        this.reposition();
    }

    /**
     * Reset the graph nodes and edges including any internal properties
     * used for tracking state
     */
    public reset() {
        this.numberOfNodesAfforded = 75;
        this.visitedNodeIds = new Set<string>();
        this.graph = new dagre.graphlib.Graph<FileNode | MetadataNode>()
            .setGraph({ width: 180, height: 36, rankdir: "TB" });
    }

    /**
     * Position nodes within graph according to edge connections and
     * height/width of individual nodes
     */
    private reposition() {
        // const nodes = Object.values(this.nodeMap);
        // let edges = Object.values(this.edgeMap);
        // nodes.forEach((node) => {
        //     this.graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
        // });

        // edges.forEach((edge) => {
        //     this.graph.setEdge(edge.source, edge.target);
        // });

        // TODO:!!!
        // dagre.layout(this.graph);

        // const rightClickedValue = "Well Label";
        // const matchingNodes = nodes.filter(node => node.data.annotation?.name === rightClickedValue);
        // const successorsToRemoved: { [key: string]: Node } = {}; 
        // const successorsToPredecessors = matchingNodes.reduce((mapSoFar, node) => {
        //     const predecessors = dagreGraph.predecessors(node.id) || [];
        //     const successors = dagreGraph.successors(node.id) || [];
        //     successors?.forEach(successor => {
        //         mapSoFar[successor] = predecessors;
        //         successorsToRemoved[successor] = node;
        //     });
        //     predecessors?.forEach(predecessor => {
        //         mapSoFar[predecessor] = successors;
        //     });
        //     return mapSoFar;
        // }, {} as { [key: string]: string[] });

        // const childrenOfRemoved: string[] = [];
        // const nodes = this.graph.nodes().forEach((nodeId) => {
        //     const node = this.graph.node(nodeId);

        //     // Shift the dagre node position (anchor=center center) to the top left
        //     // so it matches the React Flow node anchor point (top left).
        //     const x = node.x - node.width / 2;
        //     const y = (node.rank || 1) * (node.height * 1.75);

        //     return {
        //         ...node,
        //         position: { x, y, },
        //     };
        // })
        // nodes.forEach((node) => {
        //     const nodeWithPosition = this.graph.node(node.id);

        //     // Shift the dagre node position (anchor=center center) to the top left
        //     // so it matches the React Flow node anchor point (top left).
        //     const x = nodeWithPosition.x - nodeWithPosition.width / 2;
        //     const y = (nodeWithPosition.rank || 1) * (nodeWithPosition.height * 1.75);

        //     node.position = { x, y, };
        //     return;

            // TODO: Add button or similar to make a grid view possible that 
            // would make the files line up in a grid according to X field
            // OHHH MAYBE THIS IS A RIGHT-CLICK OPTION AVAILABLE ON METADATA NODES
            // WHEN CLICKED IT WOULD ARRANGE THE CHILDREN INTO A GRID

            // const isFileNode = !!node.data.file;
            // const rightClickedValue = "Well Label";
            // const isRightClickedValue = node.data.annotation?.name === rightClickedValue;
            // if (isRightClickedValue) {
                // re-target edges relating to this guy
                // graph.edges = graph.edges.map(edge => {
                //     if (edge.source === node.id) {
                //         console.log("before", edge.source);
                //         console.log("predecessors", dagreGraph.predecessors(node.id)?.[0])
                //         edge.source = dagreGraph.predecessors(node.id)?.[0] || node.id;
                //         console.log("after", edge.source);
                //     } else if (edge.target === node.id) {
                //         edge.target = dagreGraph.successors(node.id)?.[0] || node.id;
                //     }
                //     return edge;
                // });
                // edges = edges.map(edge => {
                //     if (edge.source === node.id) {
                //         console.log("before", edge.source);
                //         console.log("predecessors", this.graph.predecessors(node.id)?.[0])
                //         edge.source = this.graph.predecessors(node.id)?.[0] || node.id;
                //         console.log("after", edge.source);
                //     } else if (edge.target === node.id) {
                //         childrenOfRemoved.push(node.id);
                //         edge.target = this.graph.successors(node.id)?.[0] || node.id;
                //     }
                //     return edge;
                // });
                // return [];
            // }
            // if (node.id in successorsToRemoved) {
            //     const removedNode = successorsToRemoved[node.id];
            //     // TODO: Curious attr rx and ry to look inot
            //     const removedValue = (removedNode.data.annotation as FmsFileAnnotation).values?.[0] as string || "";
            //     const verticalPosition = parseInt(removedValue.charAt(1), 10);
            //     const horizontalPosition = removedValue.charAt(0) === "A"
            //         ? 1
            //         : 2;
            //     const horizontalStep = 43 + NODE_WIDTH;
            //     const verticalStep = 90 + NODE_HEIGHT;
            //     console.log("removedNode.position.y", removedNode.position.y, removedNode.position.y + (verticalStep * verticalPosition) - (verticalStep * 0))
            //     console.log("removedNode.position.x", removedNode.position.x, removedNode.position.x + (horizontalStep * horizontalPosition) - (horizontalStep * 0))
            //     return {
            //         ...node,
            //         position: {
            //             y: y + (verticalStep * verticalPosition) - (verticalStep * 0),
            //             x: x + (horizontalStep * horizontalPosition) - (horizontalStep * 0) ,
            //         }
            //     }
            // }

            // return [{
            //     ...node,
            //     position: { x, y, },
            // }];
        // });
    }

    /**
     * As input takes a node along with the distance this node is from the origin, then
     * recursively searchs for related nodes by checking each edge definition for a potential
     * edge that could be used to build a connection.
     */
    private async expand(thisNode: FileNode | MetadataNode) {
        // Base-case: Stop building graph after X recursions
        // to avoid getting too large of a graph on first go
        // or if this node has already been investigated
        if (this.numberOfNodesAfforded < 0 || this.visitedNodeIds.has(thisNode.id)) {
            return;
        }

        // TODO: silos? if no, remove the set below
        this.addNode(thisNode);
        this.visitedNodeIds.add(thisNode.id);
        await Promise.all(
            this.edgeDefinitions.map(async (edgeDefinition) => {
                if (!thisNode.data.file) {
                    return Promise.all([
                        this.expandUsingMetadataNode(
                            thisNode as MetadataNode, edgeDefinition, edgeDefinition.parent
                        ),
                        this.expandUsingMetadataNode(
                            thisNode as MetadataNode, edgeDefinition, edgeDefinition.child
                        )
                    ]);
                }

                // Check this file node for any viable connections
                const [parentNodes, childNodes] = await Promise.all([
                    this.getFileNodeConnections(
                        thisNode as FileNode, edgeDefinition.parent
                    ),
                    this.getFileNodeConnections(
                        thisNode as FileNode, edgeDefinition.child
                    )
                ]);

                // Only generate the edge if the parent and child node both exist
                // (otherwise what is there even to connect)
                const annotationEdge = createAnnotationEdge(edgeDefinition, thisNode.data.file);
                if (!!parentNodes.length && !!childNodes.length && annotationEdge) {
                    // Expand child and parent nodes recursively
                    await Promise.all(
                        [...parentNodes, ...childNodes]
                        .map(node => this.expand(node))
                    );

                    // For each combination of parent and node,
                    // add an edge
                    parentNodes.forEach(parentNode => {
                        childNodes.forEach(childNode => {
                            this.graph.setEdge(parentNode.id, childNode.id, annotationEdge);
                        })
                    });
                }
            })
        );
    }

    /**
     * Finds all the nodes related to the given file type node
     */
    private async getFileNodeConnections(thisNode: FileNode, edgeNode: EdgeNode): Promise<(FileNode | MetadataNode)[]> {
        // The node might just be the current node!
        const isEdgeNodeThisNode = edgeNode.name === "File ID"; // TODO: Expand this... should there be type of "ID" or "Self" or smthn..?
        if (isEdgeNodeThisNode) {
            return [thisNode];
        }
        // Annotation may not exist on this file, this could happen
        // for some files for which there shouldn't be an edge connecting
        // to this file for that annotation
        const annotation = thisNode.data.file.getAnnotation(edgeNode.name);
        if (!annotation) {
            return [];
        }
        // The Node could be a file such as when an annotation points to another
        // file via an annotation; an example of this is the "Input File" metadata key
        // we have seen users use to note the ID of a file used as input to the segmentation
        // model that generated the current node ("thisNode")
        const isNodeAFile = edgeNode.type === "file";
        if (!isNodeAFile) {
            return [this.createMetadataNode(thisNode.data.file, annotation)];
        }

        return Promise.all(
            (annotation.values as string[]).map(async (fileId) => (
                // Avoid re-requesting the file when possible
                this.graph.node(fileId) || createFileNode(await this.getFileById(fileId))
        )));
    }

    /**
     * Finds all the nodes related to the given metadata type node
     */
    private async expandUsingMetadataNode(
        thisNode: MetadataNode,
        edgeDefinition: EdgeDefinition,
        edgeNode: EdgeNode,
    ) {
        // If edgeNode is just thisNode, return
        const isEdgeNodeThisNode = edgeNode.name === thisNode.data.annotation.name;
        if (isEdgeNodeThisNode) {
            return;
        }

        // Ignore file <-> file edge definitions
        // and edges that aren't relevant to this annotation
        const annotationName = thisNode.data.annotation.name;
        const isFileToFileEdge =
            edgeDefinition.parent.type === "file" && edgeDefinition.child.type === "file";
        const hasConnectionToThisNode =
            annotationName === edgeDefinition.parent.name ||
            annotationName === edgeDefinition.child.name;
        if (isFileToFileEdge || !hasConnectionToThisNode) {
            return;
        }

        // At this point we know the metadata node has connections (potentially
        // just the original node). However, we don't want to just outright create
        // the metadata nodes and return them because that could tie files to metadata
        // it does not need to be tied to. For example, if we have definitions:
        // Publication -> Plate Barcode & Plate Barcode -> File
        // we do not want to tie Publication -> File directly even though the metadata
        // key "Publication" will be coming from the files themselves
        const files = await this.getFilesByAnnotation(thisNode.data.annotation);
        await Promise.all(files.map(file => this.expand(createFileNode(file))));
    }

    /**
     * Retrieve the one file that is identified by this ID
     */
    private async getFileById(id: string): Promise<FileDetail> {
        const files = await this.fileService.getFiles({
            from: 0,
            limit: 1,
            fileSet: new FileSet({
                fileService: this.fileService,
                filters: [new FileFilter("File ID", id)],
            }),
        });
        if (files.length !== 1) {
            throw new Error(`Failed to fetch 1 file for ID ${id}. Found ${files.length} instead.`);
        }
        return files[0];
    }

    /**
     * Retrieve all the files that have any of the metadata values given as input
     */
    private getFilesByAnnotation(annotation: FmsFileAnnotation): Promise<FileDetail[]> {
        return this.fileService.getFiles({
            from: 0,
            limit: 100, // Arbitrary, might want to consider another value or paging
            fileSet: new FileSet({
                fileService: this.fileService,
                // TODO: Make sure this works with multiple values
                filters: [new FileFilter(annotation.name, annotation.values)]
            })
        });
    }

    /**
     * Creates a node to be displayed on the metadata relationship graph.
     * The node this creates is specifically for displaying a non-File
     * metadata value. For example: Well: B4
     * 
     * Generates a unique id for a metadata node given by tracing the ancestors
     * of the node and creating a concatenated id from each ancestor node.
     * The purpose of this is to avoid a situation like the following:
     * Given a Plate "AB12" and "CD34" that each have a Well "A4" we want
     * to create two distinct metadata nodes that are "A4" rather than a singular
     * "A4" node with two parents.
     */
    private createMetadataNode(file: FileDetail, annotation: FmsFileAnnotation): MetadataNode {
        const id = [...(this.childToAncestorsMap[annotation.name] || []), annotation.name]
            .map(annotationName => `${annotationName}: ${file.getAnnotation(annotationName)?.values?.join(", ")}`)
            .join("-");
        return {
            id,
            data: {
                annotation,
                file: undefined,
                isSelected: false,
            },
            // Placeholder values
            position: { x: 0, y: 0 },
            type: NodeType.METADATA,
        };
    }

    /**
     * Adds node the graph and adjusts internal tracking properties
     */
    private addNode(node: FileNode | MetadataNode): void {
        this.numberOfNodesAfforded -= 1;
        this.visitedNodeIds.add(node.id);
        this.graph.setNode(node.id, node);
    }
}
