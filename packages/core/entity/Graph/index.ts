import dagre, { GraphEdge } from "@dagrejs/dagre";
import { Edge, Node } from "@xyflow/react";

import FileDetail from "../FileDetail";
import FileFilter from "../FileFilter";
import FileSet from "../FileSet";
import FileService, { FmsFileAnnotation } from "../../services/FileService";

const FILE_NODE_HEIGHT = 125;
const FILE_NODE_WIDTH = 110;
const METADATA_NODE_WIDTH = 180;
const METADATA_NODE_HEIGHT = 45;
const MAX_NODE_HEIGHT = Math.max(FILE_NODE_HEIGHT, METADATA_NODE_HEIGHT);
const MAX_NODE_WIDTH = Math.max(FILE_NODE_WIDTH, METADATA_NODE_WIDTH);
const ROW_SPACING = MAX_NODE_HEIGHT + 25;
const COLUMN_SPACING = MAX_NODE_WIDTH + 25;

export enum EdgeType {
    DEFAULT = "default",
}

export enum NodeType {
    METADATA = "metadata",
    FILE = "file",
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

export function getGridPosition(
    child: FileNode | MetadataNode
): { column: number; row: number } | undefined {
    const valueToCheck = child.data.annotation?.values[0] as string;
    if (!valueToCheck) {
        return undefined;
    }
    const indexOfFirstNumeric = valueToCheck.search(/\d/);
    const indexOfFirstLetter = valueToCheck.search(/[a-zA-Z]/);
    const reversedValueToCheck = valueToCheck.split("").reverse().join("");
    const indexOfLastNumeric = valueToCheck.length - reversedValueToCheck.search(/\d/);
    const indexOfLastLetter = valueToCheck.length - reversedValueToCheck.search(/[a-zA-Z]/);

    const parseNumeric = (stringToParse: string, startIndex: number, endIndex: number) =>
        parseInt(stringToParse.substring(startIndex, endIndex + 1), 10);
    const parseLetters = (stringToParse: string, startIndex: number, endIndex: number) =>
        stringToParse
            .substring(startIndex, endIndex)
            .split("")
            .map((char) => char.charCodeAt(0) - 64)
            .reduce((valueSoFar, charCode) => valueSoFar * charCode, 1);

    // If numeric value is first then the grid positioning is like so: 1A, 3C where the column
    // is a number and the row is a letter
    if (indexOfFirstNumeric > indexOfFirstLetter) {
        if (indexOfLastNumeric > indexOfLastLetter) {
            return {
                column: parseNumeric(valueToCheck, indexOfFirstNumeric, indexOfLastNumeric),
                row: parseLetters(valueToCheck, indexOfFirstLetter, indexOfLastLetter),
            };
        }
    } else if (indexOfFirstLetter > indexOfFirstNumeric) {
        // Otherwise, if numeric value is last then the grid positioning is like so: A1, C3 where the column
        // is a letter and the row is a number
        if (indexOfLastLetter > indexOfLastNumeric) {
            return {
                column: parseLetters(valueToCheck, indexOfFirstLetter, indexOfLastLetter),
                row: parseNumeric(valueToCheck, indexOfFirstNumeric, indexOfLastNumeric),
            };
        }
    }

    return undefined;
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
        // Placeholder values: Overwritten in this.nodes()
        position: { x: 0, y: 0 },
        width: FILE_NODE_WIDTH,
        height: FILE_NODE_HEIGHT,
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
function createAnnotationEdge(
    edgeDefinition: EdgeDefinition,
    file: FileDetail
): AnnotationEdge | undefined {
    if (edgeDefinition.relationshipType === "pointer") {
        const annotation = file.getAnnotation(edgeDefinition.relationship);
        if (!annotation) return undefined;
        return {
            name: annotation.name,
            value: `${annotation.values[0]}`,
            parent: edgeDefinition.parent.name,
            child: edgeDefinition.child.name,
        };
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
    private readonly visitedNodeIds = new Set<string>();
    private graph: dagre.graphlib.Graph<FileNode | MetadataNode> = new dagre.graphlib.Graph();

    /**
     * Static method for building a map of a child node (defined by the child's name in the edge definition)
     * to all possible ancestors
     */
    private static createChildToAncestorsMap(
        edgeDefinitions: EdgeDefinition[]
    ): { [child: string]: string[] } {
        // Step 1: Create map of children to their IMMEDIATE parents
        const childToParentMap = edgeDefinitions.reduce(
            (mapSoFar, edgeDefinition) => ({
                ...mapSoFar,
                [edgeDefinition.child.name]:
                    edgeDefinition.child.name in mapSoFar
                        ? mapSoFar[edgeDefinition.child.name].add(edgeDefinition.parent.name)
                        : new Set<string>().add(edgeDefinition.parent.name),
            }),
            {} as { [child: string]: Set<string> }
        );

        // Step 2: Create recursive function for grabbing all ancestors of any given child
        const getAllAncestorsOfChild = (child: string): Set<string> =>
            new Set([
                // Get all the parents of this child
                ...(childToParentMap[child] || []),
                // ...and also all the parents of the parents of this child (recursively)
                ...[...(childToParentMap[child] || [])].flatMap((parent) => [
                    ...getAllAncestorsOfChild(parent),
                ]),
            ]);

        // Step 3: Create map of children to their ancestors (including parents)
        return edgeDefinitions.reduce(
            (mapSoFar, edgeDefinition) => ({
                ...mapSoFar,
                [edgeDefinition.child.name]:
                    mapSoFar[edgeDefinition.child.name] ||
                    [...getAllAncestorsOfChild(edgeDefinition.child.name)].sort(),
            }),
            {} as { [child: string]: string[] }
        );
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
        return this.graph.nodes().map((nodeId) => {
            const node = this.graph.node(nodeId); // .node() is O(1)
            // Should be impossible, but just in case
            if (!node) {
                throw new Error(
                    `An edge is pointing to a node that doesn't exist (${nodeId})` +
                        " - this is likely a bug with the graph's construction."
                );
            }
            return {
                ...node,
                // We want the nodes of higher rank to show below those of lower rank
                // such that the top of the tree could overlap the bottom of the tree
                zIndex: this.graph.nodeCount() - (node.rank || 0),
                // Dagre puts the position at the top level, but the xyflow
                // expects the positioning within this block so we have to
                // remap it here
                position: { x: node.x, y: node.y },
            };
        });
    }

    /**
     * Quick getter for grabbing a list of the edges in the graph
     */
    public get edges(): Edge<AnnotationEdge>[] {
        return this.graph.edges().map((edgeObj) => {
            const edge = this.graph.edge(edgeObj) as GraphEdge & AnnotationEdge; // .edge() is O(1)
            // Should be impossible, but just in case
            if (!edge) {
                throw new Error(
                    `Edge (${JSON.stringify(edgeObj)}) can't be found - it might be` +
                        " pointing to a node that doesn't exist - " +
                        " this is likely a bug with the graph's construction."
                );
            }
            return {
                ...edge,
                source: edgeObj.v,
                target: edgeObj.w,
                data: edge,
                id: `${edgeObj.v}-${edgeObj.w}-${edge.name}-${edge.value}`,
            };
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
        dagre.layout(this.graph);
    }

    /**
     * Reset the graph nodes and edges including any internal properties
     * used for tracking state
     */
    public reset() {
        this.numberOfNodesAfforded = 75;
        this.visitedNodeIds.clear();
        this.graph = new dagre.graphlib.Graph<FileNode | MetadataNode>()
            .setGraph({ rankdir: "TB" })
            .setDefaultEdgeLabel(() => ({}));
    }

    /**
     * Position nodes within graph according to edge connections and
     * height/width of individual nodes
     */
    public organize(
        nodeId: string,
        layout: "grid" | "tree" | "compact",
        opts: { offset: number; position?: { x: number; y: number } } = { offset: 2 }
    ) {
        if (layout === "compact") {
            const parent = this.graph.node(nodeId);
            let offset = opts.offset;

            // First stack the immediate children
            const children = this.getChildren(nodeId);
            for (const child of children) {
                child.x = parent.x + offset;
                child.y = parent.y + offset;
                offset += 2;
            }
            // Then stack up the children of the children
            for (const child of children) {
                this.organize(child.id, "compact", { offset });
            }
        } else if (layout === "grid") {
            const parent = this.graph.node(nodeId);
            // Track the min/max column so that we can adjust the midpoint
            // of where the grid should start later on when assigning the positions
            // to the nodes
            let minColumn = 1;
            let maxColumn = 1;
            const childIdToGridPosition: Record<string, { column: number; row: number }> = {};
            const children = this.getChildren(nodeId);
            for (const child of children) {
                const gridPosition = getGridPosition(child);
                // Should be impossible since this is only enabled for
                // nodes that we can determine a grid position for, but ya never
                // know + type safety
                if (!gridPosition) {
                    throw new Error(`Unable to determine grid order for node: ${child.id}`);
                }
                minColumn = Math.min(minColumn, gridPosition.column);
                maxColumn = Math.max(maxColumn, gridPosition.column);
                childIdToGridPosition[child.id] = gridPosition;
            }

            // Now that we have an idea of both where the nodes think they are
            // within the grid and an idea of the grid size we can assign
            // actual XY positions
            const medianColumn = (maxColumn - minColumn) / 2;
            for (const child of children) {
                const gridPosition = childIdToGridPosition[child.id];

                // Offset the column by the median column
                // so that the position is centered by the parent
                // (Ex. column A in a grid from A-D should be to the
                // left of the parent when arranged)
                const column = gridPosition.column - medianColumn - 1;

                child.x = parent.x + COLUMN_SPACING * column;
                child.y = parent.y + ROW_SPACING * gridPosition.row;
                this.organize(child.id, "compact");
            }
        } else if (layout === "tree") {
            // If no parent provided, default to the current node
            const position = opts.position || this.graph.node(nodeId);

            // Reposition the children (and recursively the
            // successors of those children) into a tree-like format
            let count = 0;
            for (const child of this.getChildren(nodeId)) {
                // Position the child's X coordinate relative
                // to the parent with the first value being directly
                // underneath then alternating left and right after
                count += 1;
                const isMiddle = count == 1;
                const isLeft = count % 2 == 0;
                if (isMiddle) {
                    child.x = position.x;
                } else if (isLeft) {
                    child.x = position.x - (COLUMN_SPACING * count) / 2;
                } else {
                    // isRight
                    child.x = position.x + (COLUMN_SPACING * count) / 2;
                }
                // The child's y position is always consistent
                child.y = position.y + ROW_SPACING;
                // After a child has been positioned we can position its children
                this.organize(child.id, "tree", { position: { x: child.x, y: child.y }, ...opts });
            }
        }
    }

    /**
     * Get the children of the given node
     */
    public getChildren(nodeId: string) {
        return (this.graph.successors(nodeId) || []).map((id) => this.graph.node(id));
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
                            thisNode as MetadataNode,
                            edgeDefinition,
                            edgeDefinition.parent
                        ),
                        this.expandUsingMetadataNode(
                            thisNode as MetadataNode,
                            edgeDefinition,
                            edgeDefinition.child
                        ),
                    ]);
                }

                // Check this file node for any viable connections
                const [parentNodes, childNodes] = await Promise.all([
                    this.getFileNodeConnections(thisNode as FileNode, edgeDefinition.parent),
                    this.getFileNodeConnections(thisNode as FileNode, edgeDefinition.child),
                ]);

                // Only generate the edge if the parent and child node both exist
                // (otherwise what is there even to connect)
                const annotationEdge = createAnnotationEdge(edgeDefinition, thisNode.data.file);
                if (!!parentNodes.length && !!childNodes.length && annotationEdge) {
                    // Expand child and parent nodes recursively
                    await Promise.all(
                        [...parentNodes, ...childNodes].map((node) => this.expand(node))
                    );

                    // For each combination of parent and node,
                    // add an edge
                    parentNodes.forEach((parentNode) => {
                        childNodes.forEach((childNode) => {
                            this.graph.setEdge(parentNode.id, childNode.id, annotationEdge);
                        });
                    });
                }
            })
        );
    }

    /**
     * Finds all the nodes related to the given file type node
     */
    private async getFileNodeConnections(
        thisNode: FileNode,
        edgeNode: EdgeNode
    ): Promise<(FileNode | MetadataNode)[]> {
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
            (annotation.values as string[]).map(
                async (fileId) =>
                    // Avoid re-requesting the file when possible
                    this.graph.node(fileId) || createFileNode(await this.getFileById(fileId))
            )
        );
    }

    /**
     * Finds all the nodes related to the given metadata type node
     */
    private async expandUsingMetadataNode(
        thisNode: MetadataNode,
        edgeDefinition: EdgeDefinition,
        edgeNode: EdgeNode
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
        await Promise.all(files.map((file) => this.expand(createFileNode(file))));
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
                filters: [new FileFilter(annotation.name, annotation.values)],
            }),
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
            .map(
                (annotationName) =>
                    `${annotationName}: ${file.getAnnotation(annotationName)?.values?.join(", ")}`
            )
            .join("-");
        return {
            id,
            data: {
                annotation,
                file: undefined,
                isSelected: false,
            },
            width: METADATA_NODE_WIDTH,
            height: METADATA_NODE_HEIGHT,
            // Placeholder values: Overwritten in this.nodes()
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
