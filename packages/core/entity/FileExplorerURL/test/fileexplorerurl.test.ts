import { expect } from "chai";

import FileExplorerURL, { FileExplorerURLComponents, Source } from "..";
import { AnnotationName } from "../../Annotation";
import FileFilter from "../../FileFilter";
import FileFolder from "../../FileFolder";
import FileSort, { SortOrder } from "../../FileSort";

describe("FileExplorerURL", () => {
    const mockSource: Source = {
        name: "Fake Collection",
        type: "csv",
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
            const components: FileExplorerURLComponents = {
                hierarchy: expectedAnnotationNames,
                filters: expectedFilters.map(({ name, value }) => new FileFilter(name, value)),
                openFolders: expectedOpenFolders.map((folder) => new FileFolder(folder)),
                sortColumn: new FileSort(AnnotationName.FILE_SIZE, SortOrder.DESC),
                source: mockSource,
            };

            // Act
            const result = FileExplorerURL.encode(components);

            // Assert
            expect(result).to.be.equal(
                "group=Cell+Line&group=Donor+Plasmid&group=Lifting%3F&filter=%7B%22name%22%3A%22Cas9%22%2C%22value%22%3A%22spCas9%22%7D&filter=%7B%22name%22%3A%22Donor+Plasmid%22%2C%22value%22%3A%22ACTB-mEGFP%22%7D&openFolder=%5B%22AICS-0%22%5D&openFolder=%5B%22AICS-0%22%2C%22ACTB-mEGFP%22%5D&openFolder=%5B%22AICS-0%22%2C%22ACTB-mEGFP%22%2Cfalse%5D&openFolder=%5B%22AICS-0%22%2C%22ACTB-mEGFP%22%2Ctrue%5D&sort=%7B%22annotationName%22%3A%22file_size%22%2C%22order%22%3A%22DESC%22%7D&source=%7B%22name%22%3A%22Fake+Collection%22%2C%22type%22%3A%22csv%22%7D"
            );
        });

        it("Encodes empty state", () => {
            // Arrange
            const components: FileExplorerURLComponents = {
                hierarchy: [],
                filters: [],
                openFolders: [],
            };

            // Act
            const result = FileExplorerURL.encode(components);

            // Assert
            expect(result).to.be.equal("");
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
                source: mockSource,
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
                source: undefined,
            };
            const encodedUrl = FileExplorerURL.encode(components);

            // Act
            const result = FileExplorerURL.decode(encodedUrl);

            // Assert
            expect(result).to.be.deep.equal(components);
        });

        it("Removes folders that are too deep for hierachy", () => {
            // Arrange
            const components: FileExplorerURLComponents = {
                hierarchy: ["Cell Line"],
                filters: [],
                openFolders: [new FileFolder(["AICS-0"]), new FileFolder(["AICS-0", false])],
            };
            const encodedUrl = FileExplorerURL.encode(components);

            // Act / Assert
            const { openFolders } = FileExplorerURL.decode(encodedUrl);
            expect(openFolders).to.be.deep.equal([new FileFolder(["AICS-0"])]);
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

        // it("provides info on converting external data source to pandas dataframe", () => {
        //     // Arrange
        //     const components: Partial<FileExplorerURLComponents> = {
        //         collection: {
        //             name: mockCollection.name,
        //             version: mockCollection.version,
        //             uri: mockCollection.uri,
        //         },
        //     };
        //     const expectedResult = `df = pandas.read_csv('${mockCollection.uri}').astype('str')`;

        //     // Act
        //     const result = FileExplorerURL.convertToPython(components);

        //     // Assert
        //     expect(result).to.contain(expectedResult);
        // });

        // it("arranges query elements in correct order", () => {
        //     // Arrange
        //     const expectedAnnotationNames = ["Plate Barcode"];
        //     const expectedFilters = [
        //         { name: "Cas9", value: "spCas9" },
        //         { name: "Donor Plasmid", value: "ACTB-mEGFP" },
        //     ];
        //     const components: Partial<FileExplorerURLComponents> = {
        //         hierarchy: expectedAnnotationNames,
        //         filters: expectedFilters.map(({ name, value }) => new FileFilter(name, value)),
        //         sortColumn: new FileSort(AnnotationName.UPLOADED, SortOrder.DESC),
        //         collection: {
        //             name: mockCollection.name,
        //             version: mockCollection.version,
        //         },
        //     };
        //     const expectedResult = /df\.groupby\(.*\)\.query\(.*\)\.query\(.*\)\.sort_values\(.*\)/i;

        //     // Act
        //     const result = FileExplorerURL.convertToPython(components);

        //     // Assert
        //     expect(result).to.match(expectedResult);
        // });
    });
});
