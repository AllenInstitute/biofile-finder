import { expect } from "chai";
import { uniqueId } from "lodash";
import { createSandbox } from "sinon";

import GraphGenerator, { EdgeDefinition } from "..";
import FileDetail from "../../FileDetail";
import { Environment } from "../../../constants";
import FileServiceNoop from "../../../services/FileService/FileServiceNoop";
import { FmsFileAnnotation } from "../../../services/FileService";


const mockFileDetail = (annotations: FmsFileAnnotation[] = []) => (
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
    )
);


describe.only("GraphGenerator", () => {
    const sandbox = createSandbox();

    afterEach(() => {
        sandbox.restore();
    });

    describe("generate", () => {
        it("generates graph with just origin when no definitions given", async () => {
            // Arrange
            const generator = new GraphGenerator(new FileServiceNoop(), []);
            const origin = mockFileDetail();

            // Act
            await generator.generate(origin);
            const actual = generator.get();

            // assert
            expect(actual.edges).to.deep.equal([]);
            expect(actual.nodes).to.be.lengthOf(1);
            expect(actual.nodes[0].id).to.deep.equal(origin.id);
        });

        it("generates single node graph when just metadata-metadata edge detected", async () => {
            // Arrange
            const expectedPlateWellLabel = "is well in";
            const edgeDefinitions: EdgeDefinition[] = [
                {
                    parent: { name: "Plate Barcode", type: "metadata" },
                    child: { name: "Well", type: "metadata" },
                    relationship: expectedPlateWellLabel,
                },
            ]
            const generator = new GraphGenerator(new FileServiceNoop(), edgeDefinitions);
            const origin = mockFileDetail([
                { name: "Plate Barcode", values: ["1234"] },
                { name: "Well", values: ["1234"] },
            ]);

            // Act
            await generator.generate(origin);
            const actual = generator.get();

            // assert
            expect(actual.edges).to.deep.equal([]);
            expect(actual.nodes).to.be.lengthOf(1);
            expect(actual.nodes[0].id).to.deep.equal(origin.id);
        });

        it("generates complex graph when metadata-metadata and file-metadata edge detected", async () => {
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
                }
            ]
            const generator = new GraphGenerator(new FileServiceNoop(), edgeDefinitions);
            const origin = mockFileDetail([
                { name: "Plate Barcode", values: ["1234"] },
                { name: "Well", values: ["A4"] },
            ]);

            // Act
            await generator.generate(origin);
            const actual = generator.get();

            // assert
            expect(actual.edges).to.be.lengthOf(2);
            expect(actual.edges.some(edge => (
                edge.source === "Well: A4"
                && edge.target === origin.id
                && edge.data?.label === expectedWellFileLabel
            ))).to.be.true;
            expect(actual.edges.some(edge => (
                edge.source === "Plate Barcode: 1234"
                && edge.target === "Well: A4"
                && edge.data?.label === expectedPlateWellLabel
            ))).to.be.true;
            expect(actual.nodes).to.be.lengthOf(3);
            expect(actual.nodes.some(node => node.id === origin.id)).to.be.true;
            expect(actual.nodes.some(node => node.id === "Well: A4")).to.be.true;
            expect(actual.nodes.some(node => node.id === "Plate Barcode: 1234")).to.be.true;
        });

        it("generates complex graph when file-file edge detected", async () => {
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
            const expectedFileToFileLabel = "is segmented from";
            const edgeDefinitions: EdgeDefinition[] = [
                {
                    parent: { name: "Segmentation ID", type: "file" },
                    child: { name: "File ID", type: "file" },
                    relationship: expectedFileToFileLabel,
                },
            ]
            const generator = new GraphGenerator(new MockFileService(), edgeDefinitions);
            const origin = mockFileDetail([
                { name: "Segmentation ID", values: [sourceFile.id] },
            ]);

            // Act
            await generator.generate(origin);
            const actual = generator.get();

            // assert
            expect(actual.edges).to.be.lengthOf(1);
            expect(actual.edges.some(edge => (
                edge.source === sourceFile.id
                && edge.target === origin.id
                && edge.data?.label === expectedFileToFileLabel
            ))).to.be.true;
            expect(actual.nodes).to.be.lengthOf(2);
            expect(actual.nodes.some(node => node.id === origin.id)).to.be.true;
            expect(actual.nodes.some(node => node.id === sourceFile.id)).to.be.true;
        });
    });
});
