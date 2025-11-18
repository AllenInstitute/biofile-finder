import dagre from "@dagrejs/dagre";
import { Edge, Node } from "@xyflow/react";
import { RefObject } from "react";

import FileDetail from "../../entity/FileDetail";
import FileFilter from "../../entity/FileFilter";
import FileSet from "../../entity/FileSet";
import FileService, { FmsFileAnnotation } from "../../services/FileService";


// TODO: Currently arbitrary placeholder values
const NODE_WIDTH = 180;
const NODE_HEIGHT = 36;

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
}

export interface ProvenanceNode extends Node {
    data: {
        isSelected: boolean;

        // Is present when the Node represents a file
        file?: FileDetail;

        // Is present when the node represents an annotation
        annotation?: FmsFileAnnotation;
    };
}

interface MetadataNode extends ProvenanceNode {
    data: {
        annotation: FmsFileAnnotation;
        file: undefined;
        isSelected: boolean;
    };
    type: NodeType.METADATA;
}

interface FileNode extends ProvenanceNode {
    data: {
        annotation: undefined;
        file: FileDetail;
        isSelected: boolean;
    };
    type: NodeType.FILE;
}

export interface Graph {
    nodes: (FileNode | MetadataNode)[];
    edges: Edge[]
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
        position: { x: 0, y: 0 }, // TODO: What is this for..? isn't this auto-calculated on the fly?
        type: NodeType.FILE,
    };
}

/**
 * Creates a node to be displayed on the metadata relationship graph.
 * The node this creates is specifically for displaying a non-File
 * metadata value. For example: Well: B4
 */
function createMetadataNode(id: string, annotation: FmsFileAnnotation): MetadataNode {
    return {
        id,
        data: {
            annotation,
            file: undefined,
            isSelected: false,
        },
        position: { x: 0, y: 0 },
        type: NodeType.METADATA,
    };
}

/**
 * Creates an edge to be displayed on the metadata relationship graph.
 */
function createEdge(edgeInfo: { label: string; parentId: string; childId: string }): Edge {
    const { label, parentId, childId } = edgeInfo;
    return {
        id: `${parentId}-${childId}-${label}`,
        data: { label },
        markerEnd: { type: "arrow" }, // TODO: Is this even used?
        source: parentId,
        target: childId,
        type: EdgeType.DEFAULT,
    };
}

/**
 * Class entity responsible for generating the nodes and edges to be displayed
 * on a relationship graph.
 * This generator takes as input:
 * * fileService: Used to query for files that may be related
 * * edgeDefinitions: Definitions of potential edge types that could be displayed;
 *   for example, parent: "Plate Barcode", child: "Well" which would be the definition for
 *   two nodes "Plate Barcode" & "Well" respectively. Additional information about the edge
 *   is captured as well, see the EdgeDefintion type for more information.
 * 
 * The main utility of this class is the generate() function will takes a file as input
 * and uses that as the origin to build the graph from.
 */
export default class GraphGenerator {
    private edgeDefinitions: EdgeDefinition[];
    private readonly edgeMap: { [id: string]: Edge } = {};
    private readonly nodeMap: { [id: string]: FileNode | MetadataNode } = {};
    private fileService: FileService;
    private childToParentMap: { [key: string]: Set<string> };
    // Track the number of nodes generated only allowing
    // a certain number to be generated at a time
    private numberOfNodesAfforded = 75;

    constructor(fileService: FileService, edgeDefinitions: EdgeDefinition[]) {
        this.fileService = fileService;
        this.edgeDefinitions = edgeDefinitions;

        this.childToParentMap = edgeDefinitions.reduce(
            (mapSoFar, edgeDefinition) => ({
                ...mapSoFar,
                [edgeDefinition.child.name]: edgeDefinition.child.name in mapSoFar
                    ? mapSoFar[edgeDefinition.child.name].add(edgeDefinition.parent.name)
                    : new Set<string>().add(edgeDefinition.parent.name)
            }),
            {} as { [child: string]: Set<string> }
        );
    }

    public get(): Graph {
        return {
            edges: Object.values(this.edgeMap),
            nodes: Object.values(this.nodeMap)
        };
    }

    /**
     * This function takes a file as input to use as the origin of the graph
     * and builds the relationship graph from there by querying for related
     * information.
     */
    public async generate(file: FileDetail) {
        this.numberOfNodesAfforded += 25;
        const origin = createFileNode(file, true);
        await this.expand(origin);
        this.reposition();
    }

    /**
     * Position nodes within graph according to edge connections and
     * height/width of individual nodes
     */
    private reposition() {
        const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
                
        // Graph customization
        // - direction: top to bottom (as opposed to left/right)
        // - (node/rank)sep: distance between individual nodes and between each generation of nodes
        dagreGraph.setGraph({ rankdir: "TB" });
        const nodes = Object.values(this.nodeMap);
        let edges = Object.values(this.edgeMap);
        nodes.forEach((node) => {
            dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
        });

        edges.forEach((edge) => {
            dagreGraph.setEdge(edge.source, edge.target);
        });

        dagre.layout(dagreGraph);

        const rightClickedValue = "Well Label";
        const matchingNodes = nodes.filter(node => node.data.annotation?.name === rightClickedValue);
        const successorsToRemoved: { [key: string]: Node } = {}; 
        const successorsToPredecessors = matchingNodes.reduce((mapSoFar, node) => {
            const predecessors = dagreGraph.predecessors(node.id) || [];
            const successors = dagreGraph.successors(node.id) || [];
            successors?.forEach(successor => {
                mapSoFar[successor] = predecessors;
                successorsToRemoved[successor] = node;
            });
            predecessors?.forEach(predecessor => {
                mapSoFar[predecessor] = successors;
            });
            return mapSoFar;
        }, {} as { [key: string]: string[] });

        const childrenOfRemoved: string[] = [];
        nodes.forEach((node) => {
            const nodeWithPosition = dagreGraph.node(node.id);

            // Shift the dagre node position (anchor=center center) to the top left
            // so it matches the React Flow node anchor point (top left).
            const x = nodeWithPosition.x - nodeWithPosition.width / 2;
            const y = (nodeWithPosition.rank || 1) * (nodeWithPosition.height * 1.75);

            // TODO: Add button or similar to make a grid view possible that 
            // would make the files line up in a grid according to X field
            // OHHH MAYBE THIS IS A RIGHT-CLICK OPTION AVAILABLE ON METADATA NODES
            // WHEN CLICKED IT WOULD ARRANGE THE CHILDREN INTO A GRID

            const isFileNode = !!node.data.file;
            const rightClickedValue = "Well Label";
            const isRightClickedValue = node.data.annotation?.name === rightClickedValue;
            if (isRightClickedValue) {
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
                edges = edges.map(edge => {
                    if (edge.source === node.id) {
                        console.log("before", edge.source);
                        console.log("predecessors", dagreGraph.predecessors(node.id)?.[0])
                        edge.source = dagreGraph.predecessors(node.id)?.[0] || node.id;
                        console.log("after", edge.source);
                    } else if (edge.target === node.id) {
                        childrenOfRemoved.push(node.id);
                        edge.target = dagreGraph.successors(node.id)?.[0] || node.id;
                    }
                    return edge;
                });
                return [];
            }
            if (node.id in successorsToRemoved) {
                const removedNode = successorsToRemoved[node.id];
                // TODO: Curious attr rx and ry to look inot
                const removedValue = (removedNode.data.annotation as FmsFileAnnotation).values?.[0] as string || "";
                const verticalPosition = parseInt(removedValue.charAt(1), 10);
                const horizontalPosition = removedValue.charAt(0) === "A"
                    ? 1
                    : 2;
                const horizontalStep = 43 + NODE_WIDTH;
                const verticalStep = 90 + NODE_HEIGHT;
                console.log("removedNode.position.y", removedNode.position.y, removedNode.position.y + (verticalStep * verticalPosition) - (verticalStep * 0))
                console.log("removedNode.position.x", removedNode.position.x, removedNode.position.x + (horizontalStep * horizontalPosition) - (horizontalStep * 0))
                return {
                    ...node,
                    position: {
                        y: y + (verticalStep * verticalPosition) - (verticalStep * 0),
                        x: x + (horizontalStep * horizontalPosition) - (horizontalStep * 0) ,
                    }
                }
            }

            return [{
                ...node,
                position: { x, y, },
            }];
        });
    }

    /**
     * As input takes a node along with the distance this node is from the origin, then
     * recursively searchs for related nodes by checking each edge definition for a potential
     * edge that could be used to build a connection.
     */
    private async expand(thisNode: FileNode | MetadataNode) {
        // Base-case: Stop building graph after X recursion levels
        // to avoid getting to large of a graph on first go
        // or if this graph has already been investigated
        // TODO: Probably want to have a direction sense here because
        //       we might want all the way to the primary ancestor
        //       and then like just the children and no siblings for example
        if (this.numberOfNodesAfforded < 0 || thisNode.id in this.nodeMap) {
            return;
        }

        // Add this node to mapping
        this.nodeMap[thisNode.id] = thisNode;
        this.numberOfNodesAfforded -= 1;

        // TODO: perhaps this should only stop when it hits a file and never
        // when it is an entity
        await Promise.all(
            this.edgeDefinitions.map(async (edgeDefinition) => {
                if (!thisNode.data.file) {
                    await Promise.all([
                        this.expandUsingMetadataNode(
                            thisNode as MetadataNode, edgeDefinition, edgeDefinition.parent, true
                        ),
                        this.expandUsingMetadataNode(
                            thisNode as MetadataNode, edgeDefinition, edgeDefinition.child
                        )
                    ]);
                    return;
                }

                const [parentNodes, childNodes] = await Promise.all([
                    this.getFileNodeConnections(
                        thisNode as FileNode, edgeDefinition.parent, true
                    ),
                    this.getFileNodeConnections(
                        thisNode as FileNode, edgeDefinition.child
                    )
                ]);
                // Only generate the edge if the parent and child node both exist
                // (otherwise what is there even to connect)
                if (!!parentNodes.length && !!childNodes.length) {
                    // Expand child and parent nodes recursively
                    await Promise.all(
                        [...parentNodes, ...childNodes]
                        .map(node => this.expand(node))
                    );

                    // For each combination of parent and node,
                    // add an edge
                    parentNodes.forEach(parentNode => {
                        childNodes.forEach(childNode => {
                            const edge = createEdge({
                                label: edgeDefinition.relationship,
                                parentId: parentNode.id,
                                childId: childNode.id,
                            });
                            this.edgeMap[edge.id] = edge;
                        })
                    })
                }
            })
        );
    }

    /**
     * Finds all the nodes related to the given file type node
     */
    private async getFileNodeConnections(thisNode: FileNode, edgeNode: EdgeNode, isParent = false): Promise<(FileNode | MetadataNode)[]> {
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
            const id = this.generateIdForAnnotation(annotation, thisNode.data.file);
            return [createMetadataNode(id, annotation)];
        }

        return Promise.all(
            (annotation.values as string[]).map(async (fileId) => (
                // Avoid re-requesting the file when possible
                fileId in this.nodeMap
                ? this.nodeMap[fileId]
                : createFileNode(await this.getFileById(fileId))
        )));
    }

    /**
     * Finds all the nodes related to the given metadata type node
     */
    private async expandUsingMetadataNode(
        thisNode: MetadataNode,
        edgeDefinition: EdgeDefinition,
        edgeNode: EdgeNode,
        isParent = false
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
            limit: 100,
            fileSet: new FileSet({
                fileService: this.fileService,
                // TODO: Make sure this works with multiple values
                filters: [new FileFilter(annotation.name, annotation.values)]
            })
        });
    }

    /**
     * TODO
     */
    private generateIdForAnnotation(annotation: FmsFileAnnotation, file: FileDetail): string {
        // TODO: Clean this all up! probably not even necessary to be this complicated!!!
        function getAllParentsOfChild(childToParents: { [child: string]: Set<string> }, child: string): Set<string> {
            return new Set([
                ...Array.from(childToParents[child] || []),
                ...Array.from(childToParents[child] || []).flatMap((parent) => Array.from(getAllParentsOfChild(childToParents, parent))),
            ]);
        }
        const allOfTheParents = Array.from(getAllParentsOfChild(this.childToParentMap, annotation.name));
        return [...allOfTheParents, annotation.name]
            .sort()
            .map(parent => `${annotation.name}: ${file.getAnnotation(parent)?.values?.join(", ")}`)
            .join("-");
    }
}
