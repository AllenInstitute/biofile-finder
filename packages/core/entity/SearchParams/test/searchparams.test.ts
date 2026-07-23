import { expect } from "chai";

import SearchParams, { SearchParamsComponents, FileView, Source, EMPTY_QUERY_COMPONENTS } from "..";
import AnnotationName from "../../Annotation/AnnotationName";
import FileFilter from "../../FileFilter";
import ExcludeFilter from "../../FileFilter/ExcludeFilter";
import FuzzyFilter from "../../FileFilter/FuzzyFilter";
import IncludeFilter from "../../FileFilter/IncludeFilter";
import FileFolder from "../../FileFolder";
import FileSort, { SortOrder } from "../../FileSort";

describe("SearchParams", () => {
    const mockSource: Source = {
        name: "Fake Collection",
        type: "csv",
    };

    const mockSourceUri = "fake-uri.test";
    const mockSourceWithUri: Source = {
        ...mockSource,
        uri: mockSourceUri,
    };

    const provenanceSourceUri = "prov-url.csv";
    const mockProvenanceSource: Source = {
        name: "Provenance source",
        type: "csv",
        uri: provenanceSourceUri,
    };

    const colDescrSourceUri = "metadata-url.csv";
    const mockColumnDescriptorSource: Source = {
        name: "Column description source",
        type: "csv",
        uri: colDescrSourceUri,
    };

    const markdownSourceUri = "dataset-descriptions.md";
    const mockMarkdownSource: Source = {
        name: "Dataset description source",
        type: "md",
        uri: markdownSourceUri,
    };

    const mockOS = "Darwin";

    describe("encode", () => {
        it("encodes hierarchy, filters, open folders, and collection", () => {
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
            const components: SearchParamsComponents = {
                columns: [],
                fileView: FileView.LIST,
                hierarchy: expectedAnnotationNames,
                filters: expectedFilters.map(({ name, value }) => new FileFilter(name, value)),
                openFolders: expectedOpenFolders.map((folder) => new FileFolder(folder)),
                sortColumn: new FileSort(AnnotationName.FILE_SIZE, SortOrder.DESC),
                sources: [mockSource],
            };

            // Act
            const result = SearchParams.encode(components);

            // Assert
            expect(result).to.be.equal(
                "group=Cell+Line&group=Donor+Plasmid&group=Lifting%3F&filter=%7B%22name%22%3A%22Cas9%22%2C%22value%22%3A%22spCas9%22%2C%22type%22%3A%22default%22%7D&filter=%7B%22name%22%3A%22Donor+Plasmid%22%2C%22value%22%3A%22ACTB-mEGFP%22%2C%22type%22%3A%22default%22%7D&openFolder=%5B%22AICS-0%22%5D&openFolder=%5B%22AICS-0%22%2C%22ACTB-mEGFP%22%5D&openFolder=%5B%22AICS-0%22%2C%22ACTB-mEGFP%22%2Cfalse%5D&openFolder=%5B%22AICS-0%22%2C%22ACTB-mEGFP%22%2Ctrue%5D&source=%7B%22name%22%3A%22Fake+Collection%22%2C%22type%22%3A%22csv%22%7D&sort=%7B%22annotationName%22%3A%22file_size%22%2C%22order%22%3A%22DESC%22%7D"
            );
        });

        it("encodes filters with fuzzy, include, and exclude filters applied", () => {
            // Arrange
            const expectedAnnotationNames = ["Cell Line", "Well.Dose.Solution.Name"];
            const expectedFilters = [
                {
                    name: AnnotationName.FILE_NAME,
                    value: "testname.csv",
                    "Well.Dose.Solution.Name": "testvalue",
                },
            ];
            const expectedFuzzyFilters = [
                { annotationName: AnnotationName.FILE_PATH, value: "/test/path" },
            ];
            const expectedIncludeFilters = [{ annotationName: "Cell Line" }];
            const expectedExcludeFilters = [{ annotationName: "Gene" }];

            const components: SearchParamsComponents = {
                columns: [],
                fileView: FileView.LIST,
                hierarchy: expectedAnnotationNames,
                filters: [
                    ...expectedFilters.map(({ name, value }) => new FileFilter(name, value)),
                    ...expectedFuzzyFilters.map(
                        (fuzzyFilter) => new FuzzyFilter(fuzzyFilter.annotationName)
                    ),
                    ...expectedExcludeFilters.map(
                        (excludeFilter) => new ExcludeFilter(excludeFilter.annotationName)
                    ),
                    ...expectedIncludeFilters.map(
                        (includeFilter) => new IncludeFilter(includeFilter.annotationName)
                    ),
                ],
                openFolders: [],
                sortColumn: new FileSort(AnnotationName.FILE_SIZE, SortOrder.DESC),
                sources: [mockSource],
            };
            // Act
            const result = SearchParams.encode(components);

            // Assert
            expect(result).to.be.equal(
                "group=Cell+Line&group=Well.Dose.Solution.Name&filter=%7B%22name%22%3A%22file_name%22%2C%22value%22%3A%22testname.csv%22%2C%22type%22%3A%22default%22%7D&filter=%7B%22name%22%3A%22file_path%22%2C%22value%22%3A%22%22%2C%22type%22%3A%22fuzzy%22%7D&filter=%7B%22name%22%3A%22Gene%22%2C%22value%22%3A%22%22%2C%22type%22%3A%22exclude%22%7D&filter=%7B%22name%22%3A%22Cell+Line%22%2C%22value%22%3A%22%22%2C%22type%22%3A%22include%22%7D&source=%7B%22name%22%3A%22Fake+Collection%22%2C%22type%22%3A%22csv%22%7D&sort=%7B%22annotationName%22%3A%22file_size%22%2C%22order%22%3A%22DESC%22%7D"
            );
        });

        it("encodes empty state", () => {
            // Arrange
            const components: SearchParamsComponents = {
                columns: [],
                fileView: FileView.LIST,
                hierarchy: [],
                filters: [],
                openFolders: [],
                sources: [],
            };

            // Act
            const result = SearchParams.encode(components);

            // Assert
            expect(result).to.be.equal("");
        });

        it("encodes source URIs when 'string' type is provided", () => {
            // Arrange
            const components: SearchParamsComponents = {
                columns: [],
                fileView: FileView.LIST,
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
            const result = SearchParams.encode(components);

            // Assert
            expect(result).to.be.equal(
                "source=%7B%22name%22%3A%22Fake+Collection%22%2C%22type%22%3A%22csv%22%2C%22uri%22%3A%22fake-uri.test%22%7D"
            );
        });

        it("encodes only the markdown file if all other sources are already contained in the markdown", () => {
            // Arrange
            const componentsWithAllSources: SearchParamsComponents = {
                columns: [],
                fileView: FileView.LIST,
                hierarchy: [],
                filters: [],
                openFolders: [],
                sources: [mockSourceWithUri, mockMarkdownSource],
                provenanceSource: mockProvenanceSource,
                sourceMetadata: mockColumnDescriptorSource,
            };
            // Encoding SearchParams with only the md source should be functionally equivalent
            const componentsWithoutSources: SearchParamsComponents = {
                columns: [],
                fileView: FileView.LIST,
                hierarchy: [],
                filters: [],
                openFolders: [],
                sources: [mockMarkdownSource],
            };

            // Act
            const expected = SearchParams.encode(componentsWithoutSources);
            const result = SearchParams.encode(componentsWithAllSources, {
                dataset_url: mockSourceUri,
                provenance_url: provenanceSourceUri,
                descriptions_url: colDescrSourceUri,
            });
            expect(result).to.equal(expected);
            expect(result).to.contain(markdownSourceUri);
            expect(result).to.not.contain(mockSourceUri);
            expect(result).to.not.contain(provenanceSourceUri);
            expect(result).to.not.contain(colDescrSourceUri);
        });

        it("encodes provenances sources that are not already contained in the markdown", () => {
            // Arrange
            const componentsWithAllSources: SearchParamsComponents = {
                columns: [],
                fileView: FileView.LIST,
                hierarchy: [],
                filters: [],
                openFolders: [],
                sources: [mockSourceWithUri, mockMarkdownSource],
                provenanceSource: mockProvenanceSource,
                sourceMetadata: mockColumnDescriptorSource,
            };
            const componentsWithProvSource: SearchParamsComponents = {
                columns: [],
                fileView: FileView.LIST,
                hierarchy: [],
                filters: [],
                openFolders: [],
                sources: [mockMarkdownSource],
                provenanceSource: mockProvenanceSource,
            };

            // Act
            const expected = SearchParams.encode(componentsWithProvSource);
            // The provenance url is not in the markdown map
            const result = SearchParams.encode(componentsWithAllSources, {
                dataset_url: mockSourceUri,
                descriptions_url: colDescrSourceUri,
            });
            expect(result).to.equal(expected);
            expect(result).to.not.contain(mockSourceUri);
            expect(result).to.not.contain(colDescrSourceUri);
            expect(result).to.contain(provenanceSourceUri);
            expect(result).to.contain(markdownSourceUri);
        });

        it("encodes column descriptor sources that are not already contained in the markdown", () => {
            // Arrange
            const componentsWithAllSources: SearchParamsComponents = {
                columns: [],
                fileView: FileView.LIST,
                hierarchy: [],
                filters: [],
                openFolders: [],
                sources: [mockSourceWithUri, mockMarkdownSource],
                provenanceSource: mockProvenanceSource,
                sourceMetadata: mockColumnDescriptorSource,
            };
            const componentsWithColDescrSource: SearchParamsComponents = {
                columns: [],
                fileView: FileView.LIST,
                hierarchy: [],
                filters: [],
                openFolders: [],
                sources: [mockMarkdownSource],
                sourceMetadata: mockColumnDescriptorSource,
            };

            // Act
            const expected = SearchParams.encode(componentsWithColDescrSource);
            // The column descriptor url is not in the markdown map
            const result = SearchParams.encode(componentsWithAllSources, {
                dataset_url: mockSourceUri,
                provenance_url: provenanceSourceUri,
            });
            expect(result).to.equal(expected);
            expect(result).to.not.contain(mockSourceUri);
            expect(result).to.not.contain(provenanceSourceUri);
            expect(result).to.contain(colDescrSourceUri);
            expect(result).to.contain(markdownSourceUri);
        });

        it("overrides the markdown if the manually-provided uris don't match", () => {
            // Arrange
            const componentsWithAllSources: SearchParamsComponents = {
                columns: [],
                fileView: FileView.LIST,
                hierarchy: [],
                filters: [],
                openFolders: [],
                sources: [mockSourceWithUri, mockMarkdownSource],
                provenanceSource: mockProvenanceSource,
                sourceMetadata: mockColumnDescriptorSource,
            };

            const componentsWithProvidedMetadataSource: SearchParamsComponents = {
                columns: [],
                fileView: FileView.LIST,
                hierarchy: [],
                filters: [],
                openFolders: [],
                sources: [mockMarkdownSource],
                sourceMetadata: mockColumnDescriptorSource,
            };

            // Act
            const expected = SearchParams.encode(componentsWithProvidedMetadataSource);
            // The manually provided column description url does not match what was in the markdown
            const result = SearchParams.encode(componentsWithAllSources, {
                dataset_url: mockSourceUri,
                provenance_url: provenanceSourceUri,
                descriptions_url: "some other non-matching uri",
            });
            expect(result).to.equal(expected);
            expect(result).to.not.contain("some other non-matching uri");
            expect(result).to.contain(colDescrSourceUri);
        });
    });

    describe("decode", () => {
        it("decodes simple URL", () => {
            // Arrange
            const params = new URLSearchParams();
            const testUrl = "http://localhost:3000/myfile.csv";
            params.append("url", testUrl);

            // Act
            const result = SearchParams.decode(params.toString());

            // Assert
            expect(result).to.deep.equal({
                ...EMPTY_QUERY_COMPONENTS,
                sources: [
                    {
                        // This grabs a date and isn't particularly important so just stub it out
                        name: result.sources[0].name,
                        type: "csv",
                        uri: testUrl,
                    },
                ],
            });
        });

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
            const expectedIncludeFilters = [{ annotationName: "Gene" }];
            const expectedExcludeFilters = [{ annotationName: "Cell Line" }];
            const expectedOpenFolders = [
                ["3500000654"],
                ["3500000654", "ACTB-mEGFP"],
                ["3500000654", "ACTB-mEGFP", false],
                ["3500000654", "ACTB-mEGFP", true],
            ];
            const components: SearchParamsComponents = {
                columns: [],
                fileView: FileView.LIST,
                hierarchy: expectedAnnotationNames,
                filters: [
                    ...expectedFilters.map(({ name, value }) => new FileFilter(name, value)),
                    ...expectedFuzzyFilters.map(
                        (fuzzyFilter) => new FuzzyFilter(fuzzyFilter.annotationName)
                    ),
                    ...expectedExcludeFilters.map(
                        (excludeFilter) => new ExcludeFilter(excludeFilter.annotationName)
                    ),
                    ...expectedIncludeFilters.map(
                        (includeFilter) => new IncludeFilter(includeFilter.annotationName)
                    ),
                ],
                openFolders: expectedOpenFolders.map((folder) => new FileFolder(folder)),
                showNoValueGroups: false,
                sortColumn: new FileSort(AnnotationName.UPLOADED, SortOrder.DESC),
                sourceMetadata: undefined,
                provenanceSource: undefined,
                provOriginId: undefined,
                sources: [mockSource],
            };
            const encodedUrl = SearchParams.encode(components);
            const encodedUrlWithWhitespace = " " + encodedUrl + " ";

            // Act
            const result = SearchParams.decode(encodedUrlWithWhitespace);

            // Assert
            expect(result).to.deep.equal(components);
        });

        it("Decodes to empty app state", () => {
            // Arrange
            const components: SearchParamsComponents = {
                columns: [],
                fileView: FileView.LIST,
                hierarchy: [],
                filters: [],
                openFolders: [],
                showNoValueGroups: false,
                sortColumn: undefined,
                sourceMetadata: undefined,
                provenanceSource: undefined,
                provOriginId: undefined,
                sources: [],
            };
            const encodedUrl = SearchParams.encode(components);

            // Act
            const result = SearchParams.decode(encodedUrl);

            // Assert
            expect(result).to.deep.equal(components);
        });

        it("Removes folders that are too deep for hierachy", () => {
            // Arrange
            const components: SearchParamsComponents = {
                columns: [],
                fileView: FileView.SMALL_THUMBNAIL,
                hierarchy: ["Cell Line"],
                filters: [],
                openFolders: [new FileFolder(["AICS-0"]), new FileFolder(["AICS-0", false])],
                sources: [],
            };
            const encodedUrl = SearchParams.encode(components);

            // Act / Assert
            const { openFolders } = SearchParams.decode(encodedUrl);
            expect(openFolders).to.deep.equal([new FileFolder(["AICS-0"])]);
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
            const components: SearchParamsComponents = {
                columns: [],
                fileView: FileView.LARGE_THUMBNAIL,
                hierarchy: expectedAnnotationNames,
                filters: expectedFilters.map(({ name, value }) => new FileFilter(name, value)),
                openFolders: expectedOpenFolders.map((folder) => new FileFolder(folder)),
                sortColumn: new FileSort(AnnotationName.FILE_PATH, "Garbage" as any),
                sources: [],
            };
            const encodedUrl = SearchParams.encode(components);

            // Act / Assert
            expect(() => SearchParams.decode(encodedUrl)).to.throw();
        });

        it("encodes the provenance ID if there is a provenance source", () => {
            // Arrange
            const componentsWithProvID: SearchParamsComponents = {
                columns: [],
                fileView: FileView.LIST,
                hierarchy: [],
                filters: [],
                openFolders: [],
                showNoValueGroups: false,
                sortColumn: undefined,
                sourceMetadata: undefined,
                provenanceSource: mockProvenanceSource,
                provOriginId: "test-id",
                sources: [],
            };
            const encodedUrl = SearchParams.encode(componentsWithProvID);

            // Act
            const result = SearchParams.decode(encodedUrl);

            // Assert
            expect(result.provOriginId).to.equal(componentsWithProvID.provOriginId);
        });

        // The markdown may or may not include a provenance url, but we keep the ID just in case
        it("encodes the provenance ID if there is a markdown source", () => {
            // Arrange
            const componentsWithProvID: SearchParamsComponents = {
                columns: [],
                fileView: FileView.LIST,
                hierarchy: [],
                filters: [],
                openFolders: [],
                showNoValueGroups: false,
                sortColumn: undefined,
                sourceMetadata: undefined,
                provenanceSource: undefined,
                provOriginId: "test",
                sources: [mockMarkdownSource],
            };
            const encodedUrl = SearchParams.encode(componentsWithProvID, {
                provenance_url: "test.csv",
            });

            // Act
            const result = SearchParams.decode(encodedUrl);

            // Assert
            expect(result.provOriginId).to.equal(componentsWithProvID.provOriginId);
        });

        it("drops the provenance ID if there is no possibility of a provenance source", () => {
            // Arrange
            const componentsWithProvID: SearchParamsComponents = {
                columns: [],
                fileView: FileView.LIST,
                hierarchy: [],
                filters: [],
                openFolders: [],
                showNoValueGroups: false,
                sortColumn: undefined,
                sourceMetadata: undefined,
                provenanceSource: undefined,
                provOriginId: "test",
                sources: [mockSourceWithUri],
            };
            const encodedUrl = SearchParams.encode(componentsWithProvID);

            // Act
            const result = SearchParams.decode(encodedUrl);

            // Assert
            expect(result.provOriginId).to.be.undefined;
        });
    });

    describe("convert to python pandas string", () => {
        it("converts groupings", () => {
            // Arrange
            const expectedAnnotationNames = ["Cell Line", "Donor Plasmid", "Lifting?"];
            const components: Partial<SearchParamsComponents> = {
                hierarchy: expectedAnnotationNames,
                sources: [mockSourceWithUri],
            };
            const expectedPandasGroups = expectedAnnotationNames.map(
                (annotation) => `.groupby('${annotation}', group_keys=True).apply(lambda x: x)`
            );
            const expectedResult = `df${expectedPandasGroups.join("")}`;

            // Act
            const result = SearchParams.convertToPython(components, mockOS);

            // Assert
            expect(result).to.contain(expectedResult);
        });

        it("converts filters", () => {
            // Arrange
            const expectedFilters = [
                { name: "Cas9", value: "spCas9" },
                { name: "Donor Plasmid", value: "ACTB-mEGFP" },
            ];
            const components: Partial<SearchParamsComponents> = {
                filters: expectedFilters.map(({ name, value }) => new FileFilter(name, value)),
                sources: [mockSourceWithUri],
            };
            const expectedPandasQueries = expectedFilters.map(
                (filter) => `\`${filter.name}\`=="${filter.value}"`
            );
            const expectedResult = `df.query('${expectedPandasQueries[0]}').query('${expectedPandasQueries[1]}')`;

            // Act
            const result = SearchParams.convertToPython(components, mockOS);

            // Assert
            expect(result).to.contain(expectedResult);
        });

        it("converts same filter with multiple values", () => {
            // Arrange
            const expectedFilters = [
                { name: "Gene", value: "AAVS1" },
                { name: "Gene", value: "ACTB" },
            ];
            const components: Partial<SearchParamsComponents> = {
                filters: expectedFilters.map(({ name, value }) => new FileFilter(name, value)),
                sources: [mockSourceWithUri],
            };
            const expectedPandasQueries = expectedFilters.map(
                (filter) => `\`${filter.name}\`=="${filter.value}"`
            );
            const expectedResult = `df.query('${expectedPandasQueries[0]} | ${expectedPandasQueries[1]}')`;

            // Act
            const result = SearchParams.convertToPython(components, mockOS);

            // Assert
            expect(result).to.contain(expectedResult);
        });

        it("converts sorts", () => {
            // Arrange
            const components: Partial<SearchParamsComponents> = {
                sortColumn: new FileSort(AnnotationName.UPLOADED, SortOrder.DESC),
                sources: [mockSourceWithUri],
            };
            const expectedPandasSort = `.sort_values(by='${AnnotationName.UPLOADED}', ascending=False`;
            const expectedResult = `df${expectedPandasSort}`;

            // Act
            const result = SearchParams.convertToPython(components, mockOS);

            // Assert
            expect(result).to.contain(expectedResult);
        });

        it("provides info on converting external data source to pandas dataframe", () => {
            // Arrange
            const components: Partial<SearchParamsComponents> = {
                sources: [mockSourceWithUri],
            };
            const expectedResult = `df = pd.read_csv('${mockSourceWithUri.uri}').astype('str')`;

            // Act
            const result = SearchParams.convertToPython(components, mockOS);

            // Assert
            expect(result).to.contain(expectedResult);
        });

        it("adds raw flag in pandas conversion code for Windows OS", () => {
            // Arrange
            const components: Partial<SearchParamsComponents> = {
                sources: [mockSourceWithUri],
            };
            const expectedResult = `df = pd.read_csv(r'${mockSourceWithUri.uri}').astype('str')`;

            // Act
            const result = SearchParams.convertToPython(components, "Windows_NT");

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
            const components: Partial<SearchParamsComponents> = {
                hierarchy: expectedAnnotationNames,
                filters: expectedFilters.map(({ name, value }) => new FileFilter(name, value)),
                sortColumn: new FileSort(AnnotationName.UPLOADED, SortOrder.DESC),
                sources: [mockSourceWithUri],
            };
            const expectedResult = /df\.groupby\(.*\)\.query\(.*\)\.query\(.*\)\.sort_values\(.*\)/i;

            // Act
            const result = SearchParams.convertToPython(components, mockOS);

            // Assert
            expect(result).to.match(expectedResult);
        });
    });
});
