import { expect } from "chai";
import sinon from "sinon";

import FileExplorerURL, { FileExplorerURLComponents } from "..";
import { AnnotationName } from "../../../constants";
import { DatasetService } from "../../../services";
import { Dataset } from "../../../services/DatasetService";
import Annotation from "../../Annotation";
import FileFilter from "../../FileFilter";
import FileFolder from "../../FileFolder";
import FileSort, { SortOrder } from "../../FileSort";

describe("FileExplorerURL", () => {
    const mockCollection: Dataset = {
        id: "12341",
        name: "Fake Collection",
        version: 1,
        query: "test",
        client: "test",
        fixed: true,
        private: true,
        created: new Date(),
        createdBy: "test",
    };

    describe("encode", () => {
        it("Encodes hierarchy, filters, open folders, and collection", () => {
            // Arrange
            const expectedAnnotationNames = ["Cell Line", "Donor Plasmid", "Lifting?"];
            const expectedFilters = [
                { name: "Cas9", value: "spCas9" },
                { name: "Donor Plasmid", value: "ACTB-mEGFP" },
            ];
            const expectedOpenFolders = [
                ["AICS-0"],
                ["AICS-0", "ACTB-mEGFP"],
                ["AICS-0", "ACTB-mEGFP", false],
                ["AICS-0", "ACTB-mEGFP", true],
            ];
            const expectedSort = {
                annotationName: AnnotationName.FILE_SIZE,
                order: SortOrder.DESC,
            };
            const components: FileExplorerURLComponents = {
                hierarchy: expectedAnnotationNames.map(
                    (annotationName) =>
                        new Annotation({
                            annotationName,
                            annotationDisplayName: "test-display-name",
                            description: "test-description",
                            type: "Date",
                        })
                ),
                filters: expectedFilters.map(({ name, value }) => new FileFilter(name, value)),
                openFolders: expectedOpenFolders.map((folder) => new FileFolder(folder)),
                sortColumn: new FileSort(AnnotationName.FILE_SIZE, SortOrder.DESC),
                collection: {
                    name: mockCollection.name,
                    version: mockCollection.version,
                },
            };
            const expectedResult =
                FileExplorerURL.PROTOCOL +
                JSON.stringify({
                    groupBy: expectedAnnotationNames,
                    filters: expectedFilters,
                    openFolders: expectedOpenFolders,
                    sort: expectedSort,
                    collection: {
                        name: mockCollection.name,
                        version: mockCollection.version,
                    },
                });

            // Act
            const result = FileExplorerURL.encode(components);

            // Assert
            expect(result).to.be.equal(expectedResult);
        });

        it("Encodes empty state", () => {
            // Arrange
            const components: FileExplorerURLComponents = {
                hierarchy: [],
                filters: [],
                openFolders: [],
            };
            const expectedResult =
                FileExplorerURL.PROTOCOL +
                JSON.stringify({
                    groupBy: [],
                    filters: [],
                    openFolders: [],
                });

            // Act
            const result = FileExplorerURL.encode(components);

            // Assert
            expect(result).to.be.equal(expectedResult);
        });
    });

    describe("decode", () => {
        it("Decodes encoded URL", () => {
            // Arrange
            const expectedAnnotationNames = ["Plate Barcode", "Donor Plasmid", "Balls?"];
            const expectedFilters = [
                { name: "Cas9", value: "spCas9" },
                { name: "Donor Plasmid", value: "ACTB-mEGFP" },
            ];
            const expectedOpenFolders = [
                ["3500000654"],
                ["3500000654", "ACTB-mEGFP"],
                ["3500000654", "ACTB-mEGFP", false],
                ["3500000654", "ACTB-mEGFP", true],
            ];
            const hierarchy = expectedAnnotationNames.map(
                (annotationName) =>
                    new Annotation({
                        annotationName,
                        annotationDisplayName: "test-display-name",
                        description: "test-description",
                        type: "Date",
                    })
            );
            const annotations = hierarchy.concat([
                new Annotation({
                    annotationName: "Cas9",
                    annotationDisplayName: "test-display-name",
                    description: "test-description",
                    type: "Date",
                }),
            ]);
            const components: FileExplorerURLComponents = {
                hierarchy,
                filters: expectedFilters.map(({ name, value }) => new FileFilter(name, value)),
                openFolders: expectedOpenFolders.map((folder) => new FileFolder(folder)),
                sortColumn: new FileSort(AnnotationName.UPLOADED, SortOrder.DESC),
                collection: {
                    name: mockCollection.name,
                    version: mockCollection.version,
                },
            };
            const encodedUrl = FileExplorerURL.encode(components);
            const encodedUrlWithWhitespace = " " + encodedUrl + " ";

            // Act
            const result = FileExplorerURL.decode(encodedUrlWithWhitespace, annotations);

            // Assert
            expect(result).to.be.deep.equal(components);
        });

        it("Decodes to empty app state", () => {
            // Arrange
            const components: FileExplorerURLComponents = {
                hierarchy: [],
                filters: [],
                openFolders: [],
                sortColumn: undefined,
                collection: undefined,
            };
            const encodedUrl = FileExplorerURL.encode(components);

            // Act
            const result = FileExplorerURL.decode(encodedUrl, []);

            // Assert
            expect(result).to.be.deep.equal(components);
        });

        it("Throws error for urls without protocol at beginning", () => {
            // Arrange
            const components: FileExplorerURLComponents = {
                hierarchy: [],
                filters: [],
                openFolders: [],
            };
            const encodedUrl = FileExplorerURL.encode(components).substring(
                FileExplorerURL.PROTOCOL.length
            );

            // Act / Assert
            expect(() => FileExplorerURL.decode(encodedUrl, [])).to.throw();
        });

        it("Throws error for urls with annotations outside of list of annotations", () => {
            // Arrange
            const components: FileExplorerURLComponents = {
                hierarchy: [
                    new Annotation({
                        annotationName: "Cell Line",
                        annotationDisplayName: "Cell Line",
                        description: "Cell Line Annotation",
                        type: "Text",
                    }),
                ],
                filters: [],
                openFolders: [],
            };
            const annotations = [
                new Annotation({
                    annotationName: "Cas9",
                    annotationDisplayName: "Cas9",
                    description: "Cas9 description",
                    type: "Text",
                }),
            ];
            const encodedUrl = FileExplorerURL.encode(components);

            // Act / Assert
            expect(() => FileExplorerURL.decode(encodedUrl, annotations)).to.throw();
        });

        it("Throws error for filters with annotations outside of list of annotations", () => {
            // Arrange
            const components: FileExplorerURLComponents = {
                hierarchy: [],
                filters: [new FileFilter("Cas9", "spCas9")],
                openFolders: [],
            };
            const annotations = [
                new Annotation({
                    annotationName: "Cell Line",
                    annotationDisplayName: "Cell Line",
                    description: "Cell Line description",
                    type: "Text",
                }),
            ];
            const encodedUrl = FileExplorerURL.encode(components);

            // Act / Assert
            expect(() => FileExplorerURL.decode(encodedUrl, annotations)).to.throw();
        });

        it("Throws error when folder depth is greater than hierarchy depth", () => {
            // Arrange
            const components: FileExplorerURLComponents = {
                hierarchy: [
                    new Annotation({
                        annotationName: "Cell Line",
                        annotationDisplayName: "Cell Line",
                        description: "Cell Line Description",
                        type: "Text",
                    }),
                ],
                filters: [],
                openFolders: [new FileFolder(["AICS-0"]), new FileFolder(["AICS-0", false])],
            };
            const annotations = [
                new Annotation({
                    annotationName: "Cell Line",
                    annotationDisplayName: "Cell Line",
                    description: "Cell Line description",
                    type: "Text",
                }),
            ];
            const encodedUrl = FileExplorerURL.encode(components);

            // Act / Assert
            expect(() => FileExplorerURL.decode(encodedUrl, annotations)).to.throw();
        });

        it("Throws error when sort column is not a file attribute", () => {
            // Arrange
            const expectedAnnotationNames = ["Plate Barcode", "Donor Plasmid", "Balls?"];
            const expectedFilters = [
                { name: "Cas9", value: "spCas9" },
                { name: "Donor Plasmid", value: "ACTB-mEGFP" },
            ];
            const expectedOpenFolders = [
                ["3500000654"],
                ["3500000654", "ACTB-mEGFP"],
                ["3500000654", "ACTB-mEGFP", false],
                ["3500000654", "ACTB-mEGFP", true],
            ];
            const hierarchy = expectedAnnotationNames.map(
                (annotationName) =>
                    new Annotation({
                        annotationName,
                        annotationDisplayName: "test-display-name",
                        description: "test-description",
                        type: "Date",
                    })
            );
            const annotations = hierarchy.concat([
                new Annotation({
                    annotationName: "Cas9",
                    annotationDisplayName: "test-display-name",
                    description: "test-description",
                    type: "Date",
                }),
            ]);
            const components: FileExplorerURLComponents = {
                hierarchy,
                filters: expectedFilters.map(({ name, value }) => new FileFilter(name, value)),
                openFolders: expectedOpenFolders.map((folder) => new FileFolder(folder)),
                sortColumn: new FileSort(AnnotationName.KIND, SortOrder.DESC),
            };
            const encodedUrl = FileExplorerURL.encode(components);

            // Act / Assert
            expect(() => FileExplorerURL.decode(encodedUrl, annotations)).to.throw();
        });

        it("Throws error when sort order is not DESC or ASC", () => {
            // Arrange
            const expectedAnnotationNames = ["Plate Barcode", "Donor Plasmid", "Balls?"];
            const expectedFilters = [
                { name: "Cas9", value: "spCas9" },
                { name: "Donor Plasmid", value: "ACTB-mEGFP" },
            ];
            const expectedOpenFolders = [
                ["3500000654"],
                ["3500000654", "ACTB-mEGFP"],
                ["3500000654", "ACTB-mEGFP", false],
                ["3500000654", "ACTB-mEGFP", true],
            ];
            const hierarchy = expectedAnnotationNames.map(
                (annotationName) =>
                    new Annotation({
                        annotationName,
                        annotationDisplayName: "test-display-name",
                        description: "test-description",
                        type: "Date",
                    })
            );
            const annotations = hierarchy.concat([
                new Annotation({
                    annotationName: "Cas9",
                    annotationDisplayName: "test-display-name",
                    description: "test-description",
                    type: "Date",
                }),
            ]);
            const components: FileExplorerURLComponents = {
                hierarchy,
                filters: expectedFilters.map(({ name, value }) => new FileFilter(name, value)),
                openFolders: expectedOpenFolders.map((folder) => new FileFolder(folder)),
                sortColumn: new FileSort(AnnotationName.FILE_PATH, "Garbage" as any),
            };
            const encodedUrl = FileExplorerURL.encode(components);

            // Act / Assert
            expect(() => FileExplorerURL.decode(encodedUrl, annotations)).to.throw();
        });
    });

    describe("validateEncodedFileExplorerURL", () => {
        const datasetService = new DatasetService();

        afterEach(() => {
            sinon.restore();
        });

        it("Returns undefined when valid URL is given", async () => {
            // Arrange
            sinon.stub(datasetService, "getDataset").resolves(mockCollection);
            const expectedAnnotationNames = ["Plate Barcode", "Donor Plasmid", "Balls?"];
            const expectedFilters = [
                { name: "Cas9", value: "spCas9" },
                { name: "Donor Plasmid", value: "ACTB-mEGFP" },
            ];
            const hierarchy = expectedAnnotationNames.map(
                (annotationName) =>
                    new Annotation({
                        annotationName,
                        annotationDisplayName: "test-display-name",
                        description: "test-description",
                        type: "Date",
                    })
            );
            const annotations = hierarchy.concat([
                new Annotation({
                    annotationName: "Cas9",
                    annotationDisplayName: "test-display-name",
                    description: "test-description",
                    type: "Date",
                }),
            ]);
            const components: FileExplorerURLComponents = {
                hierarchy,
                filters: expectedFilters.map(({ name, value }) => new FileFilter(name, value)),
                openFolders: [],
                sortColumn: new FileSort(AnnotationName.FILE_ID, SortOrder.ASC),
                collection: {
                    name: mockCollection.name,
                    version: mockCollection.version,
                },
            };
            const encodedUrl = FileExplorerURL.encode(components);
            const encodedUrlWithWhitespace = " " + encodedUrl + " ";

            // Act
            const result = await FileExplorerURL.validateEncodedFileExplorerURL(
                encodedUrlWithWhitespace,
                annotations,
                datasetService
            );

            // Assert
            expect(result).to.be.undefined;
        });

        it("Returns error message when dataset can not be found", async () => {
            // Arrange
            const errMsg = "No Dataset found";
            sinon.stub(datasetService, "getDataset").rejects(new Error(errMsg));
            const components: FileExplorerURLComponents = {
                hierarchy: [],
                filters: [],
                openFolders: [],
                collection: {
                    name: "My Tiffs",
                    version: 1,
                },
            };
            const encodedUrl = FileExplorerURL.encode(components);

            // Act
            const result = await FileExplorerURL.validateEncodedFileExplorerURL(
                encodedUrl,
                [],
                datasetService
            );

            // Assert
            expect(result).to.equal(
                `Unable to decode FileExplorerURL, collection could not be found ${errMsg}`
            );
        });

        it("Returns error message when not in expected JSON format", async () => {
            // Arrange
            const encodedUrl =
                FileExplorerURL.PROTOCOL +
                JSON.stringify({
                    hierarchy: [],
                    filters: [],
                    c: [],
                });

            // Act
            const result = await FileExplorerURL.validateEncodedFileExplorerURL(
                encodedUrl,
                [],
                datasetService
            );

            // Assert
            expect(result).to.not.be.empty;
        });

        it("Returns error message when protocol is not present as expected", async () => {
            // Arrange
            const components: FileExplorerURLComponents = {
                hierarchy: [],
                filters: [],
                openFolders: [],
            };
            const encodedUrl = FileExplorerURL.encode(components).substring(
                FileExplorerURL.PROTOCOL.length
            );

            // Act
            const result = await FileExplorerURL.validateEncodedFileExplorerURL(
                encodedUrl,
                [],
                datasetService
            );

            // Assert
            expect(result).to.not.be.empty;
        });

        it("Returns error message when hierarchy has annotation outside of list of annotations", async () => {
            // Arrange
            const components: FileExplorerURLComponents = {
                hierarchy: [
                    new Annotation({
                        annotationName: "Cell Line",
                        annotationDisplayName: "Cell Line",
                        description: "Cell Line Annotation",
                        type: "Text",
                    }),
                ],
                filters: [],
                openFolders: [],
            };
            const annotations = [
                new Annotation({
                    annotationName: "Cas9",
                    annotationDisplayName: "Cas9",
                    description: "Cas9 description",
                    type: "Text",
                }),
            ];
            const encodedUrl = FileExplorerURL.encode(components);

            // Act
            const result = await FileExplorerURL.validateEncodedFileExplorerURL(
                encodedUrl,
                annotations,
                datasetService
            );

            // Assert
            expect(result).to.not.be.empty;
        });

        it("Returns error message when filters has annotation outside of list of annotations", async () => {
            // Arrange
            const components: FileExplorerURLComponents = {
                hierarchy: [],
                filters: [new FileFilter("Cas9", "spCas9")],
                openFolders: [],
            };
            const annotations = [
                new Annotation({
                    annotationName: "Cell Line",
                    annotationDisplayName: "Cell Line",
                    description: "Cell Line description",
                    type: "Text",
                }),
            ];
            const encodedUrl = FileExplorerURL.encode(components);

            // Act
            const result = await FileExplorerURL.validateEncodedFileExplorerURL(
                encodedUrl,
                annotations,
                datasetService
            );

            // Assert
            expect(result).to.not.be.empty;
        });

        it("Returns error message when sort column is not a file attribute", async () => {
            // Arrange
            const expectedAnnotationNames = ["Plate Barcode", "Donor Plasmid", "Balls?"];
            const expectedFilters = [
                { name: "Cas9", value: "spCas9" },
                { name: "Donor Plasmid", value: "ACTB-mEGFP" },
            ];
            const hierarchy = expectedAnnotationNames.map(
                (annotationName) =>
                    new Annotation({
                        annotationName,
                        annotationDisplayName: "test-display-name",
                        description: "test-description",
                        type: "Date",
                    })
            );
            const annotations = hierarchy.concat([
                new Annotation({
                    annotationName: "Cas9",
                    annotationDisplayName: "test-display-name",
                    description: "test-description",
                    type: "Date",
                }),
            ]);
            const components: FileExplorerURLComponents = {
                hierarchy,
                filters: expectedFilters.map(({ name, value }) => new FileFilter(name, value)),
                openFolders: [],
                sortColumn: new FileSort(AnnotationName.KIND, SortOrder.ASC),
            };
            const encodedUrl = FileExplorerURL.encode(components);

            // Act
            const result = await FileExplorerURL.validateEncodedFileExplorerURL(
                encodedUrl,
                annotations,
                datasetService
            );

            // Assert
            expect(result).to.not.be.empty;
        });

        it("Returns error message when sort order is not ASC or DESC", async () => {
            // Arrange
            const expectedAnnotationNames = ["Plate Barcode", "Donor Plasmid", "Balls?"];
            const expectedFilters = [
                { name: "Cas9", value: "spCas9" },
                { name: "Donor Plasmid", value: "ACTB-mEGFP" },
            ];
            const hierarchy = expectedAnnotationNames.map(
                (annotationName) =>
                    new Annotation({
                        annotationName,
                        annotationDisplayName: "test-display-name",
                        description: "test-description",
                        type: "Date",
                    })
            );
            const annotations = hierarchy.concat([
                new Annotation({
                    annotationName: "Cas9",
                    annotationDisplayName: "test-display-name",
                    description: "test-description",
                    type: "Date",
                }),
            ]);
            const components: FileExplorerURLComponents = {
                hierarchy,
                filters: expectedFilters.map(({ name, value }) => new FileFilter(name, value)),
                openFolders: [],
                sortColumn: new FileSort(AnnotationName.FILE_PATH, "Not ASC" as any),
            };
            const encodedUrl = FileExplorerURL.encode(components);

            // Act
            const result = await FileExplorerURL.validateEncodedFileExplorerURL(
                encodedUrl,
                annotations,
                datasetService
            );

            // Assert
            expect(result).to.not.be.empty;
        });
    });
});
