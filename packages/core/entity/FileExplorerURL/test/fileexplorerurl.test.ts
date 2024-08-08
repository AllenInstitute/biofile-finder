import { expect } from "chai";

import FileExplorerURL, { FileExplorerURLComponents, Source } from "..";
import AnnotationName from "../../Annotation/AnnotationName";
import FileFilter from "../../FileFilter";
import FileFolder from "../../FileFolder";
import FileSort, { SortOrder } from "../../FileSort";
import FuzzyFilter from "../../FuzzyFilter";

describe("FileExplorerURL", () => {
    const mockSource: Source = {
        name: "Fake Collection",
        type: "csv",
    };

    const mockSourceWithUri: Source = {
        ...mockSource,
        uri: "fake-uri.test",
    };

    const mockOS = "Darwin";

    describe("encode", () => {
        it("Encodes hierarchy, filters, open folders, and collection", () => {
            // Arrange
            const expectedAnnotationNames = ["Cell Line", "Donor Plasmid", "Lifting?"];
            const expectedFilters = [
                { name: "Cas9", value: "spCas9" },
                { name: "Donor Plasmid", value: "ACTB-mEGFP" },
            ];
            const expectedFuzzyFilters = [
                { annotationName: AnnotationName.FILE_NAME },
                { annotationName: AnnotationName.FILE_PATH },
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
                fuzzyFilters: expectedFuzzyFilters.map(
                    (fuzzyFilter) => new FuzzyFilter(fuzzyFilter.annotationName)
                ),
                openFolders: expectedOpenFolders.map((folder) => new FileFolder(folder)),
                sortColumn: new FileSort(AnnotationName.FILE_SIZE, SortOrder.DESC),
                sources: [mockSource],
            };

            // Act
            const result = FileExplorerURL.encode(components);

            // Assert
            expect(result).to.be.equal(
                "group=Cell+Line&group=Donor+Plasmid&group=Lifting%3F&filter=%7B%22name%22%3A%22Cas9%22%2C%22value%22%3A%22spCas9%22%7D&filter=%7B%22name%22%3A%22Donor+Plasmid%22%2C%22value%22%3A%22ACTB-mEGFP%22%7D&fuzzy=%7B%22annotationName%22%3A%22file_name%22%7D&fuzzy=%7B%22annotationName%22%3A%22file_path%22%7D&openFolder=%5B%22AICS-0%22%5D&openFolder=%5B%22AICS-0%22%2C%22ACTB-mEGFP%22%5D&openFolder=%5B%22AICS-0%22%2C%22ACTB-mEGFP%22%2Cfalse%5D&openFolder=%5B%22AICS-0%22%2C%22ACTB-mEGFP%22%2Ctrue%5D&source=%7B%22name%22%3A%22Fake+Collection%22%2C%22type%22%3A%22csv%22%7D&sort=%7B%22annotationName%22%3A%22file_size%22%2C%22order%22%3A%22DESC%22%7D"
            );
        });

        it("Encodes empty state", () => {
            // Arrange
            const components: FileExplorerURLComponents = {
                hierarchy: [],
                filters: [],
                fuzzyFilters: [],
                openFolders: [],
                sources: [],
            };

            // Act
            const result = FileExplorerURL.encode(components);

            // Assert
            expect(result).to.be.equal("");
        });

        it("encodes source URIs when 'string' type is provided", () => {
            // Arrange
            const components: FileExplorerURLComponents = {
                hierarchy: [],
                filters: [],
                openFolders: [],
                sources: [
                    {
                        name: "Fake Collection",
                        type: "csv",
                        uri: "fake-uri.test",
                    },
                ],
            };

            // Act
            const result = FileExplorerURL.encode(components);

            // Assert
            expect(result).to.be.equal(
                "source=%7B%22name%22%3A%22Fake+Collection%22%2C%22type%22%3A%22csv%22%2C%22uri%22%3A%22fake-uri.test%22%7D"
            );
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
            const expectedFuzzyFilters = [
                { annotationName: AnnotationName.FILE_NAME },
                { annotationName: AnnotationName.FILE_PATH },
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
                fuzzyFilters: expectedFuzzyFilters.map(
                    (fuzzyFilter) => new FuzzyFilter(fuzzyFilter.annotationName)
                ),
                openFolders: expectedOpenFolders.map((folder) => new FileFolder(folder)),
                sortColumn: new FileSort(AnnotationName.UPLOADED, SortOrder.DESC),
                sources: [mockSource],
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
                fuzzyFilters: [],
                openFolders: [],
                sortColumn: undefined,
                sources: [],
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
                sources: [],
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
                sources: [],
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
                sources: [mockSourceWithUri],
            };
            const expectedPandasGroups = expectedAnnotationNames.map(
                (annotation) => `.groupby('${annotation}', group_keys=True).apply(lambda x: x)`
            );
            const expectedResult = `df${expectedPandasGroups.join("")}`;

            // Act
            const result = FileExplorerURL.convertToPython(components, mockOS);

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
                sources: [mockSourceWithUri],
            };
            const expectedPandasQueries = expectedFilters.map(
                (filter) => `\`${filter.name}\`=="${filter.value}"`
            );
            const expectedResult = `df.query('${expectedPandasQueries[0]}').query('${expectedPandasQueries[1]}')`;

            // Act
            const result = FileExplorerURL.convertToPython(components, mockOS);

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
                sources: [mockSourceWithUri],
            };
            const expectedPandasQueries = expectedFilters.map(
                (filter) => `\`${filter.name}\`=="${filter.value}"`
            );
            const expectedResult = `df.query('${expectedPandasQueries[0]} | ${expectedPandasQueries[1]}')`;

            // Act
            const result = FileExplorerURL.convertToPython(components, mockOS);

            // Assert
            expect(result).to.contain(expectedResult);
        });

        it("converts sorts", () => {
            // Arrange
            const components: Partial<FileExplorerURLComponents> = {
                sortColumn: new FileSort(AnnotationName.UPLOADED, SortOrder.DESC),
                sources: [mockSourceWithUri],
            };
            const expectedPandasSort = `.sort_values(by='${AnnotationName.UPLOADED}', ascending=False`;
            const expectedResult = `df${expectedPandasSort}`;

            // Act
            const result = FileExplorerURL.convertToPython(components, mockOS);

            // Assert
            expect(result).to.contain(expectedResult);
        });

        it("provides info on converting external data source to pandas dataframe", () => {
            // Arrange
            const components: Partial<FileExplorerURLComponents> = {
                sources: [mockSourceWithUri],
            };
            const expectedResult = `df = pd.read_csv('${mockSourceWithUri.uri}').astype('str')`;

            // Act
            const result = FileExplorerURL.convertToPython(components, mockOS);

            // Assert
            expect(result).to.contain(expectedResult);
        });

        it("adds raw flag in pandas conversion code for Windows OS", () => {
            // Arrange
            const components: Partial<FileExplorerURLComponents> = {
                sources: [mockSourceWithUri],
            };
            const expectedResult = `df = pd.read_csv(r'${mockSourceWithUri.uri}').astype('str')`;

            // Act
            const result = FileExplorerURL.convertToPython(components, "Windows_NT");

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
                sources: [mockSourceWithUri],
            };
            const expectedResult = /df\.groupby\(.*\)\.query\(.*\)\.query\(.*\)\.sort_values\(.*\)/i;

            // Act
            const result = FileExplorerURL.convertToPython(components, mockOS);

            // Assert
            expect(result).to.match(expectedResult);
        });
    });
});
