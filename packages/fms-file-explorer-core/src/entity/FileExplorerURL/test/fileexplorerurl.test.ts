import { expect } from "chai";

import FileExplorerURL, { FileExplorerURLComponents } from "..";
import Annotation from "../../Annotation";
import FileFilter from "../../FileFilter";
import FileFolder from "../../FileFolder";

describe("FileExplorerURL", () => {
    describe("encode", () => {
        it("Encodes hierarchy, filters, and open folders", () => {
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
            };
            const expectedResult =
                FileExplorerURL.PROTOCOL +
                JSON.stringify({
                    groupBy: expectedAnnotationNames,
                    filters: expectedFilters,
                    openFolders: expectedOpenFolders,
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
    });

    describe("validateEncodedFileExplorerURL", () => {
        it("Returns undefined when valid URL is given", () => {
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
            };
            const encodedUrl = FileExplorerURL.encode(components);
            const encodedUrlWithWhitespace = " " + encodedUrl + " ";

            // Act
            const result = FileExplorerURL.validateEncodedFileExplorerURL(
                encodedUrlWithWhitespace,
                annotations
            );

            // Assert
            expect(result).to.be.undefined;
        });

        it("Returns error message when not in expected JSON format", () => {
            // Arrange
            const encodedUrl =
                FileExplorerURL.PROTOCOL +
                JSON.stringify({
                    hierarchy: [],
                    filters: [],
                    c: [],
                });

            // Act
            const result = FileExplorerURL.validateEncodedFileExplorerURL(encodedUrl, []);

            // Assert
            expect(result).to.not.be.empty;
        });

        it("Returns error message when protocol is not present as expected", () => {
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
            const result = FileExplorerURL.validateEncodedFileExplorerURL(encodedUrl, []);

            // Assert
            expect(result).to.not.be.empty;
        });

        it("Returns error message when hierarchy has annotation outside of list of annotations", () => {
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
            const result = FileExplorerURL.validateEncodedFileExplorerURL(encodedUrl, annotations);

            // Assert
            expect(result).to.not.be.empty;
        });

        it("Returns error message when filters has annotation outside of list of annotations", () => {
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
            const result = FileExplorerURL.validateEncodedFileExplorerURL(encodedUrl, annotations);

            // Assert
            expect(result).to.not.be.empty;
        });
    });
});
