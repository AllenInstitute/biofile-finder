import { Edge, Node } from "@xyflow/react";

import FileDetail from "../../entity/FileDetail";
import FileFilter from "../../entity/FileFilter";
import FileSet from "../../entity/FileSet";
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

    /**
     * This function takes a file as input to use as the origin of the graph
     * and builds the relationship graph from there by querying for related
     * information.
     */
    public async generate(file: FileDetail) {
        this.numberOfNodesAfforded += 25;
        const origin = createFileNode(file, true);
        await this.expand(origin);
        return {
            edges: Object.values(this.edgeMap),
            nodes: Object.values(this.nodeMap)
        };
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
