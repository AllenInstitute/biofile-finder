import { expect } from "chai";

import FileExplorerURL, { FileExplorerURLComponents } from "..";
import { Dataset } from "../../../services/DatasetService";
import { AnnotationName } from "../../Annotation";
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
        uri: "test/file.csv",
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
                hierarchy: expectedAnnotationNames,
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
            const components: FileExplorerURLComponents = {
                hierarchy: expectedAnnotationNames,
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
            const result = FileExplorerURL.decode(encodedUrlWithWhitespace);

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
            const result = FileExplorerURL.decode(encodedUrl);

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
            expect(() => FileExplorerURL.decode(encodedUrl)).to.throw();
        });

        it("Throws error when folder depth is greater than hierarchy depth", () => {
            // Arrange
            const components: FileExplorerURLComponents = {
                hierarchy: ["Cell Line"],
                filters: [],
                openFolders: [new FileFolder(["AICS-0"]), new FileFolder(["AICS-0", false])],
            };
            const encodedUrl = FileExplorerURL.encode(components);

            // Act / Assert
            expect(() => FileExplorerURL.decode(encodedUrl)).to.throw();
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
            const components: FileExplorerURLComponents = {
                hierarchy: expectedAnnotationNames,
                filters: expectedFilters.map(({ name, value }) => new FileFilter(name, value)),
                openFolders: expectedOpenFolders.map((folder) => new FileFolder(folder)),
                sortColumn: new FileSort(AnnotationName.FILE_PATH, "Garbage" as any),
            };
            const encodedUrl = FileExplorerURL.encode(components);

            // Act / Assert
            expect(() => FileExplorerURL.decode(encodedUrl)).to.throw();
        });
    });

    describe("convert to python pandas string", () => {
        it("converts groupings", () => {
            // Arrange
            const expectedAnnotationNames = ["Cell Line", "Donor Plasmid", "Lifting?"];
            const components: Partial<FileExplorerURLComponents> = {
                hierarchy: expectedAnnotationNames,
            };
            const expectedPandasGroups = expectedAnnotationNames.map(
                (annotation) => `.groupby('${annotation}', group_keys=True).apply(lambda x: x)`
            );
            const expectedResult = `df${expectedPandasGroups.join("")}`;

            // Act
            const result = FileExplorerURL.convertToPython(components);

            // Assert
            expect(result).to.contain(expectedResult);
        });

        it("converts filters", () => {
            // Arrange
            const expectedFilters = [
                { name: "Cas9", value: "spCas9" },
                { name: "Donor Plasmid", value: "ACTB-mEGFP" },
            ];
            const components: Partial<FileExplorerURLComponents> = {
                filters: expectedFilters.map(({ name, value }) => new FileFilter(name, value)),
            };
            const expectedPandasQueries = expectedFilters.map(
                (filter) => `\`${filter.name}\`=="${filter.value}"`
            );
            const expectedResult = `df.query('${expectedPandasQueries[0]}').query('${expectedPandasQueries[1]}')`;

            // Act
            const result = FileExplorerURL.convertToPython(components);

            // Assert
            expect(result).to.contain(expectedResult);
        });

        it("converts same filter with multiple values", () => {
            // Arrange
            const expectedFilters = [
                { name: "Gene", value: "AAVS1" },
                { name: "Gene", value: "ACTB" },
            ];
            const components: Partial<FileExplorerURLComponents> = {
                filters: expectedFilters.map(({ name, value }) => new FileFilter(name, value)),
            };
            const expectedPandasQueries = expectedFilters.map(
                (filter) => `\`${filter.name}\`=="${filter.value}"`
            );
            const expectedResult = `df.query('${expectedPandasQueries[0]} | ${expectedPandasQueries[1]}')`;

            // Act
            const result = FileExplorerURL.convertToPython(components);

            // Assert
            expect(result).to.contain(expectedResult);
        });

        it("converts sorts", () => {
            // Arrange
            const components: Partial<FileExplorerURLComponents> = {
                sortColumn: new FileSort(AnnotationName.UPLOADED, SortOrder.DESC),
            };
            const expectedPandasSort = `.sort_values(by='${AnnotationName.UPLOADED}', ascending=False`;
            const expectedResult = `df${expectedPandasSort}`;

            // Act
            const result = FileExplorerURL.convertToPython(components);

            // Assert
            expect(result).to.contain(expectedResult);
        });

        it("provides info on converting external data source to pandas dataframe", () => {
            // Arrange
            const components: Partial<FileExplorerURLComponents> = {
                collection: {
                    name: mockCollection.name,
                    version: mockCollection.version,
                    uri: mockCollection.uri,
                },
            };
            const expectedResult = `df = pandas.read_csv('${mockCollection.uri}').astype('str')`;

            // Act
            const result = FileExplorerURL.convertToPython(components);

            // Assert
            expect(result).to.contain(expectedResult);
        });

        it("arranges query elements in correct order", () => {
            // Arrange
            const expectedAnnotationNames = ["Plate Barcode"];
            const expectedFilters = [
                { name: "Cas9", value: "spCas9" },
                { name: "Donor Plasmid", value: "ACTB-mEGFP" },
            ];
            const components: Partial<FileExplorerURLComponents> = {
                hierarchy: expectedAnnotationNames,
                filters: expectedFilters.map(({ name, value }) => new FileFilter(name, value)),
                sortColumn: new FileSort(AnnotationName.UPLOADED, SortOrder.DESC),
                collection: {
                    name: mockCollection.name,
                    version: mockCollection.version,
                },
            };
            const expectedResult = /df\.groupby\(.*\)\.query\(.*\)\.query\(.*\)\.sort_values\(.*\)/i;

            // Act
            const result = FileExplorerURL.convertToPython(components);

            // Assert
            expect(result).to.match(expectedResult);
        });
    });
});
