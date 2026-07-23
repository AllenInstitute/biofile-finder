import { expect } from "chai";
import sinon from "sinon";

import { DatasetMetadata, parseFrontMatter, processMarkdown } from "../MarkdownFrontMatter";
import { Source } from "../../SearchParams";
import axios from "axios";

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
            const markdownText = `---
title: ${title}
dataset_url: ${datasetUrl}
provenance_url: ${provUrl}
descriptions_url: ${colDescriptorUrl}
---
${description}`;

            // Act
            const parsedFrontMatter = parseFrontMatter(markdownText);
            const expectedMetadata: DatasetMetadata = {
                title: title,
                dataset_url: datasetUrl,
                descriptions_url: colDescriptorUrl,
                provenance_url: provUrl,
            };

            // Assert
            expect(parsedFrontMatter.body).to.equal(description);
            expect(parsedFrontMatter.metadata).to.deep.equal(expectedMetadata);
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

        it("returns only body for malformed yaml", () => {
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
        });
    });

    describe("processMarkdown", () => {
        // string formatted this way for whitespace
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

        it("throws an error for a non-processable source (e.g., plain local path)", async () => {
            // Arrange
            const tempFileName = `test-markdown.md`;
            const userPath = "/user/file/we/cannot/access/from/browser";
            const testFile: Source = { name: tempFileName, type: "md", uri: userPath };

            // Act
            const result = processMarkdown(testFile);
            // Assert
            expect(async () => await result).to.throw;
        });
    });
});
