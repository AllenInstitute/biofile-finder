import { Edge } from "@xyflow/react";

import FileDetail from "../../entity/FileDetail";
import FileFilter from "../../entity/FileFilter";
import FileSet from "../../entity/FileSet";
import FileService, { FmsFileAnnotation } from "../../services/FileService";
import { EdgeDefinition, ProvenanceNode } from "../../state/provenance/reducer";

const MAX_RELATIONSHIP_DISTANCE = 10;

interface AnnotationNode extends ProvenanceNode {
    data: {
        annotation: FmsFileAnnotation;
        file: undefined;
        isSelected: boolean;
    };
}

interface FileNode extends ProvenanceNode {
    data: {
        annotation: undefined;
        file: FileDetail;
        isSelected: boolean;
    };
}

/**
 * TODO
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
        type: "file",
    };
}

/**
 * TODO
 */
function createAnnotationNode(annotation: FmsFileAnnotation): AnnotationNode {
    return {
        id: `${annotation.name}: ${annotation.values.join(", ")}`,
        data: {
            annotation,
            file: undefined,
            isSelected: false,
        },
        position: { x: 0, y: 0 },
        type: "non-file",
    };
}

/**
 * TODO
 */
function createEdge(edgeInfo: { label: string; parentId: string; childId: string }): Edge {
    const { label, parentId, childId } = edgeInfo;
    return {
        id: `${parentId}-${childId}`,
        data: { label },
        markerEnd: { type: "arrow" }, // TODO: Is this even used?
        source: parentId,
        target: childId,
        type: "custom-edge",
    };
}

/**
 * TODO
 */
export default class GraphGenerator {
    private edgeDefinitions: EdgeDefinition[];
    private readonly edgeMap: { [id: string]: Edge } = {};
    private readonly nodeMap: { [id: string]: AnnotationNode | FileNode } = {};
    private fileService: FileService;

    constructor(fileService: FileService, edgeDefinitions: EdgeDefinition[]) {
        this.fileService = fileService;
        this.edgeDefinitions = edgeDefinitions;
    }

    /**
     * TODO
     */
    public async generate(file: FileDetail) {
        const origin = createFileNode(file);
        await this.expand(origin, 0);
        return { edgeMap: this.edgeMap, nodeMap: this.nodeMap };
    }

    private async expand(thisNode: AnnotationNode | FileNode, relationshipDistance: number) {
        // Base-case: Stop building graph after X recursion levels
        // to avoid getting to large of a graph on first go
        // or if this graph has already been investigated
        // TODO: Probably want to have a direction sense here because
        //       we might want all the way to the primary ancestor
        //       and then like just the children and no siblings for example
        if (relationshipDistance > MAX_RELATIONSHIP_DISTANCE || thisNode.id in this.nodeMap) {
            return;
        }

        // Add this node to mapping
        this.nodeMap[thisNode.id] = thisNode;

        // TODO: perhaps this should only stop when it hits a file and never
        // when it is an entity
        await Promise.all(
            this.edgeDefinitions.map(async (edgeDefinition) => {
                const [parentNode, childNode] = thisNode.data.file
                    ? await this.interpretFileNode(thisNode as FileNode, edgeDefinition)
                    : await this.interpretAnnotationNode(
                          thisNode as AnnotationNode,
                          edgeDefinition
                      );

                // Only generate the edge if the parent and child node both exist
                // (otherwise what is there even to connect)
                if (parentNode && childNode) {
                    // Expand child and parent nodes recursively
                    await Promise.all(
                        [childNode, parentNode].map((node) =>
                            this.expand(node as FileNode, relationshipDistance)
                        )
                    );

                    // Add edge to graph
                    const edge = createEdge({
                        label: edgeDefinition.relationship,
                        parentId: parentNode.id,
                        childId: childNode.id,
                    });
                    this.edgeMap[edge.id] = edge;
                }
            })
        );
    }

    /**
     * TODO
     */
    private async interpretFileNode(thisNode: FileNode, edgeDefinition: EdgeDefinition) {
        return Promise.all(
            [edgeDefinition.parent, edgeDefinition.child].map(async (edgeNode) => {
                // The node might just be the current node!
                const isEdgeNodeThisNode = edgeNode.name === "File ID"; // TODO: Expand this... should there be type of "ID" or "Self" or smthn..?
                if (isEdgeNodeThisNode) {
                    return thisNode;
                }

                // Annotation may not exist on this file, this could happen
                // for some files for which there shouldn't be an edge connecting
                // to this file for that annotation
                const annotation = thisNode.data.file.getAnnotation(edgeNode.name);
                if (annotation) {
                    // The Node could be a file such as when an annotation points to another
                    // file via an annotation; an example of this is the "Input File" metadata key
                    // we have seen users use to note the ID of a file used as input to the segmentation
                    // model that generated the current node ("thisNode")
                    const isNodeAFile = edgeNode.type === "file";
                    if (isNodeAFile) {
                        const nodeFileId = annotation.values[0] as string; // TODO: Not friendly to arrays :/
                        // Avoid re-requesting the file
                        if (nodeFileId in this.nodeMap) {
                            return this.nodeMap[nodeFileId];
                        }
                        const nodeFile = await this.getFileById(nodeFileId);
                        return createFileNode(nodeFile);
                    } else {
                        return createAnnotationNode(annotation);
                    }
                }
            })
        );
    }

    private async interpretAnnotationNode(
        thisNode: AnnotationNode,
        edgeDefinition: EdgeDefinition
    ) {
        // Ignore file <-> file edge definitions
        // and edges that aren't relevant to this annotation
        const annotationName = thisNode.data.annotation.name;
        const isFileToFileEdge =
            edgeDefinition.parent.type !== "file" || edgeDefinition.child.type !== "file";
        const isRelevantToThisAnnotation =
            annotationName === edgeDefinition.parent.name ||
            annotationName === edgeDefinition.child.name;
        if (isFileToFileEdge || !isRelevantToThisAnnotation) {
            return [undefined, undefined];
        }

        return Promise.all(
            [edgeDefinition.parent, edgeDefinition.child].map(async (edgeNode) => {
                // The node might just be the current node!
                const isEdgeNodeThisNode = edgeNode.name === thisNode.data.annotation.name;
                if (isEdgeNodeThisNode) {
                    return thisNode;
                }

                const files = await this.getFilesByAnnotation(thisNode.data.annotation);
                const file = files[0]; // TODO: need to support > 1
                return createFileNode(file);
            })
        );
    }

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
            // TODO: Improve here
            throw Error("Ugh idk man why not 1");
        }
        return files[0];
    }

    private async getFilesByAnnotation(_annotation: FmsFileAnnotation): Promise<FileDetail[]> {
        // TODO
        return [];
    }
}
