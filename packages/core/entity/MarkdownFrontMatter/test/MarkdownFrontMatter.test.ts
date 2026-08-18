import axios from "axios";
import { expect } from "chai";
import sinon from "sinon";

import { ParsedDatasetMetadata, parseFrontMatter, processMarkdown } from "..";
import { Source } from "../../SearchParams";
import DataSourcePreparationError from "../../../errors/DataSourcePreparationError";

describe("MarkdownFrontMatter", () => {
    let consoleErrorStub: any;

    beforeEach(() => {
        // stub console.error to suppress the output just for this test suite
        consoleErrorStub = sinon.stub(console, "error");
    });

    afterEach(() => {
        consoleErrorStub.restore();
    });

    describe("parseFrontMatter", () => {
        it("parses basic metadata and body from valid markdown", () => {
            // Arrange
            const title = "My Dataset";
            const datasetUrl = "test-url.csv";
            const provUrl = "prov-url.csv";
            const colDescriptorUrl = "cd-url.csv";
            const description = "This is a text description";
            // no indents to avoid including whitespace
            const markdownText = `---
title: ${title}
dataset_url: ${datasetUrl}
provenance_url: ${provUrl}
descriptions_url: ${colDescriptorUrl}
---
${description}`;

            // Act
            const parsedFrontMatter = parseFrontMatter(markdownText, false);
            const expectedMetadata: ParsedDatasetMetadata = {
                title: title,
                dataset_url: datasetUrl,
                descriptions_url: colDescriptorUrl,
                provenance_url: provUrl,
            };

            // Assert
            expect(parsedFrontMatter.body).to.equal(description);
            expect(parsedFrontMatter.metadata).to.deep.equal(expectedMetadata);
        });

        it("extracts sources from valid markdown when 'parseSources=true'", async () => {
            // Arrange
            const title = "My Dataset";
            const datasetUrl = "test-url.csv";
            const provUrl = "prov-url.csv";
            const colDescriptorUrl = "cd-url.csv";
            const description = "This is a text description";
            // no indents to avoid including whitespace
            const markdownText = `---
title: ${title}
dataset_url: ${datasetUrl}
provenance_url: ${provUrl}
descriptions_url: ${colDescriptorUrl}
---
${description}`;

            // Act
            const parsedFrontMatter = parseFrontMatter(markdownText, true);

            // Assert
            expect(parsedFrontMatter.body).to.equal(description);
            // For this test, can't compare actual vs expected results directly bc getNameAndTypeFromSourceUrl
            // is brittle/Date()-dependent and returns a different name each second.
            // Instead, just check it contains expected source keys and uris
            expect(parsedFrontMatter.metadata?.dataSource?.uri).to.equal(datasetUrl);
            expect(parsedFrontMatter.metadata?.provenanceSource?.uri).to.equal(provUrl);
            expect(parsedFrontMatter.metadata?.descriptionsSource?.uri).to.equal(colDescriptorUrl);
            expect(parsedFrontMatter.error).to.be.undefined;
        });

        it("skips parsing frontmatter if missing opening '---'", () => {
            const title = "My Dataset";
            const datasetUrl = "test-url.csv";
            const provUrl = "prov-url.csv";
            const colDescriptorUrl = "cd-url.csv";
            const description = "This is a text description";
            const markdownText = `
title: ${title}
dataset_url: ${datasetUrl}
provenance_url: ${provUrl}
descriptions_url: ${colDescriptorUrl}
---
${description}`;

            // Act
            const parsedFrontMatter = parseFrontMatter(markdownText);

            // Assert
            expect(parsedFrontMatter.body).to.equal(markdownText);
            expect(parsedFrontMatter.metadata).to.equal(undefined);
        });

        it("returns only body and a warning for malformed yaml", () => {
            const description = "This is a text description";
            const markdownText = `---
title: Some Title
title: Duplicate key
This:is:also: not valid yaml
---
${description}`;

            // Act
            const parsedFrontMatter = parseFrontMatter(markdownText);

            // Assert
            expect(parsedFrontMatter.metadata).to.equal(undefined);
            expect(String(parsedFrontMatter.body)).to.equal(String(markdownText));
            expect(parsedFrontMatter.error).to.match(
                /Unable to parse yaml: duplicated mapping key/
            );
        });
    });

    describe("processMarkdown", () => {
        // string indented this way for whitespace
        const validMarkdownText = `---
title: Some Title
dataset_url: mainUrl.csv
provenance_url: provUrl.csv
descriptions_url: colDescriptionsUrl.csv
---
A description of the dataset`;

        before(async () => {
            sinon.stub(axios, "get").returns(Promise.resolve({ data: validMarkdownText }));
        });

        after(async () => {
            sinon.restore();
        });

        it("processes markdown directly from File object", async () => {
            // Arrange
            const tempFileName = `test-markdown.md`;
            const blob = new Blob([validMarkdownText], { type: "text/plain" });
            const testFile = new File([blob], tempFileName);

            // Act
            const result = await processMarkdown({ name: tempFileName, uri: testFile });
            const expected = parseFrontMatter(validMarkdownText);
            // Assert
            expect(result).to.deep.equal(expected);
        });

        it("processes markdown from url source", async () => {
            // Arrange
            const tempFileName = `test-markdown.md`;
            const markdownUri = "https://fake-uri/file.md";
            const testFile: Source = { name: tempFileName, type: "md", uri: markdownUri };

            // Act
            const result = await processMarkdown(testFile);
            const expected = parseFrontMatter(validMarkdownText);
            // Assert
            expect(result).to.deep.equal(expected);
        });

        it("throws an error when unable to fetch from uri (e.g., plain local path)", async () => {
            sinon.restore();
            sinon.stub(axios, "get").returns(Promise.reject());
            // Arrange
            const tempFileName = `test-markdown.md`;
            // this path is just illustrative, does not impact the test
            const userPath = "/user/file/path/we/cannot/access/from/browser";
            const testFile: Source = { name: tempFileName, type: "md", uri: userPath };

            try {
                // Act
                await processMarkdown(testFile);
                // shouldn't reach here, evergreen test
                expect.fail("Expected processMarkdown function to throw, but it succeeded");
            } catch (err) {
                // Assert
                expect(err).to.be.instanceOf(DataSourcePreparationError);
                expect(err).to.match(/Unable to process markdown file with URL/);
                expect((err as Error).message).to.contain(userPath);
            }
        });
    });
});
