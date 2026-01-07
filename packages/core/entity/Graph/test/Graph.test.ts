import { expect } from "chai";
import { uniqueId } from "lodash";

import FileDetail from "../../FileDetail";
import { Environment } from "../../../constants";
import FileServiceNoop from "../../../services/FileService/FileServiceNoop";
import { FmsFileAnnotation } from "../../../services/FileService";

import Graph, { EdgeDefinition } from "..";

const mockFileDetail = (annotations: FmsFileAnnotation[] = []) =>
    new FileDetail(
        {
            annotations,
            file_path: uniqueId() + ".txt",
            file_id: uniqueId(),
            file_name: "MyFile.txt",
            file_size: 7,
            uploaded: "01/01/01",
        },
        Environment.TEST
    );

describe("Graph", () => {
    describe("originate: no edges case", () => {
        // Arrange
        const expectedPlateWellLabel = "is well in";
        const edgeDefinitions: EdgeDefinition[] = [
            {
                parent: { name: "Plate Barcode", type: "metadata" },
                child: { name: "Well", type: "metadata" },
                relationship: expectedPlateWellLabel,
            },
        ];
        const origin = mockFileDetail([{ name: "Well", values: ["A4"] }]);

        it("creates no edges", async () => {
            const graph = new Graph(new FileServiceNoop(), edgeDefinitions);
            await graph.originate(origin);

            // Assert
            expect(graph.edges).to.empty;
            expect(graph.nodes).to.be.lengthOf(1);
            expect(graph.nodes[0].id).to.deep.equal(origin.id);
        });

        it("creates singular origin node", async () => {
            // Arrange
            const graph = new Graph(new FileServiceNoop(), []);
            await graph.originate(origin);

            // Assert
            expect(graph.nodes).to.be.lengthOf(1);
            expect(graph.nodes[0].id).to.deep.equal(origin.id);
        });
    });

    describe("originate: file-metadata type edges", () => {
        // Arrange
        const expectedWellFileLabel = "is image in";
        const edgeDefinitions: EdgeDefinition[] = [
            {
                parent: { name: "Well", type: "metadata" },
                child: { name: "File ID", type: "file" },
                relationship: expectedWellFileLabel,
            },
        ];
        const origin = mockFileDetail([{ name: "Well", values: ["A4"] }]);

        it("creates accurate edge", async () => {
            // Act
            const graph = new Graph(new FileServiceNoop(), edgeDefinitions);
            await graph.originate(origin);

            // Assert
            expect(graph.edges).to.be.lengthOf(1);
            expect(graph.edges[0].source).to.equal("Well: A4");
            expect(graph.edges[0].target).to.equal(origin.id);
            expect(graph.edges[0].data?.value).to.equal(expectedWellFileLabel);
        });

        it("creates accurate nodes", async () => {
            // Act
            const graph = new Graph(new FileServiceNoop(), edgeDefinitions);
            await graph.originate(origin);

            // Assert
            expect(graph.nodes).to.be.lengthOf(2);
            expect(graph.nodes.some((node) => node.id === origin.id)).to.be.true;
            expect(graph.nodes.some((node) => node.id === "Well: A4")).to.be.true;
        });
    });

    describe("originate: metadata-metadata and file-metadata type edges", () => {
        // Arrange
        const expectedPlateWellLabel = "is well in";
        const expectedWellFileLabel = "is image in";
        const edgeDefinitions: EdgeDefinition[] = [
            {
                parent: { name: "Plate Barcode", type: "metadata" },
                child: { name: "Well", type: "metadata" },
                relationship: expectedPlateWellLabel,
            },
            {
                parent: { name: "Well", type: "metadata" },
                child: { name: "File ID", type: "file" },
                relationship: expectedWellFileLabel,
            },
        ];
        const origin = mockFileDetail([
            { name: "Plate Barcode", values: ["1234"] },
            { name: "Well", values: ["A4"] },
        ]);

        it("creates accurate edges", async () => {
            // Act
            const graph = new Graph(new FileServiceNoop(), edgeDefinitions);
            await graph.originate(origin);

            // Assert
            expect(graph.edges).to.be.lengthOf(2);
            expect(
                graph.edges.some(
                    (edge) =>
                        edge.source === "Plate Barcode: 1234" &&
                        edge.target === "Plate Barcode: 1234-Well: A4" &&
                        edge.data?.value === expectedPlateWellLabel
                )
            ).to.be.true;
            expect(
                graph.edges.some(
                    (edge) =>
                        edge.source === "Plate Barcode: 1234-Well: A4" &&
                        edge.target === origin.id &&
                        edge.data?.value === expectedWellFileLabel
                )
            ).to.be.true;
        });

        it("creates accurate nodes", async () => {
            // Act
            const graph = new Graph(new FileServiceNoop(), edgeDefinitions);
            await graph.originate(origin);

            // Assert
            expect(graph.nodes).to.be.lengthOf(3);
            expect(graph.nodes.some((node) => node.id === origin.id)).to.be.true;
            expect(graph.nodes.some((node) => node.id === "Plate Barcode: 1234")).to.be.true;
            expect(graph.nodes.some((node) => node.id === "Plate Barcode: 1234-Well: A4")).to.be
                .true;
        });
    });

    describe("originate: file-file type edges", () => {
        // Arrange
        const sourceFile = mockFileDetail();
        class MockFileService extends FileServiceNoop {
            private callCount = 0;
            public async getFiles() {
                this.callCount += 1;
                if (this.callCount === 1) {
                    return [sourceFile];
                }
                throw new Error("Too many calls!");
            }
        }
        const expectedPointer = "Algorithm";
        const expectedAlgorithm = "v1.2.0";
        const edgeDefinitions: EdgeDefinition[] = [
            {
                parent: { name: "Segmentation ID", type: "file" },
                child: { name: "File ID", type: "file" },
                relationship: expectedPointer,
                relationshipType: "pointer",
            },
        ];
        const origin = mockFileDetail([
            { name: edgeDefinitions[0].parent.name, values: [sourceFile.id] },
            { name: expectedPointer, values: [expectedAlgorithm] },
        ]);

        it("creates accurate edge", async () => {
            // Act
            const graph = new Graph(new MockFileService(), edgeDefinitions);
            await graph.originate(origin);

            // Assert
            expect(graph.edges).to.be.lengthOf(1);
            expect(graph.edges[0].source).to.equal(sourceFile.id);
            expect(graph.edges[0].target).to.equal(origin.id);
            expect(graph.edges[0].data?.name).to.equal(expectedPointer);
            expect(graph.edges[0].data?.value).to.equal(expectedAlgorithm);
        });

        it("creates accurate nodes", async () => {
            // Act
            const graph = new Graph(new MockFileService(), edgeDefinitions);
            await graph.originate(origin);

            // Assert
            expect(graph.nodes).to.be.lengthOf(2);
            expect(graph.nodes.some((node) => node.id === origin.id)).to.be.true;
            expect(graph.nodes.some((node) => node.id === sourceFile.id)).to.be.true;
        });
    });

    describe("reset", () => {
        it("clears used graph", async () => {
            // Arrange
            const expectedWellFileLabel = "is image in";
            const edgeDefinitions: EdgeDefinition[] = [
                {
                    parent: { name: "Well", type: "metadata" },
                    child: { name: "File ID", type: "file" },
                    relationship: expectedWellFileLabel,
                },
            ];
            const origin = mockFileDetail([{ name: "Well", values: ["A4"] }]);
            const graph = new Graph(new FileServiceNoop(), edgeDefinitions);
            await graph.originate(origin);

            // (sanity-check): has nodes and edge
            expect(graph.nodes).to.be.lengthOf(2);
            expect(graph.edges).to.be.lengthOf(1);

            // Act
            graph.reset();

            // Assert
            expect(graph.nodes).to.be.empty;
            expect(graph.edges).to.be.empty;
        });
    });
});
