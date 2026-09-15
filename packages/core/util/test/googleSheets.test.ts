import { expect } from "chai";

import { isGoogleSheetUri, parseGoogleSheetUrl } from "../googleSheets";

describe("googleSheets", () => {
    const SHEET_ID = "1DcolQrEYpy4AKAxJLa7OYjoKpsS-fUqv4vZrGlsONRM";
    const EXPORT_BASE = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

    describe("parseGoogleSheetUrl", () => {
        it("rewrites a pasted edit URL with the tab in the query string", () => {
            // arrange
            const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=2073732512#gid=2073732512`;

            // act
            const result = parseGoogleSheetUrl(url);

            // assert
            expect(result?.csvUrl).to.equal(`${EXPORT_BASE}&gid=2073732512`);
        });

        it("reads the tab out of the URL fragment when it is not in the query string", () => {
            // arrange
            const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=1234`;

            // act
            const result = parseGoogleSheetUrl(url);

            // assert
            expect(result?.csvUrl).to.equal(`${EXPORT_BASE}&gid=1234`);
        });

        it("omits the tab when the URL does not name one", () => {
            // arrange
            const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?usp=sharing`;

            // act
            const result = parseGoogleSheetUrl(url);

            // assert
            expect(result?.csvUrl).to.equal(EXPORT_BASE);
        });

        it("handles URLs from a multi-account session", () => {
            // arrange
            const url = `https://docs.google.com/spreadsheets/u/1/d/${SHEET_ID}/edit?gid=0`;

            // act
            const result = parseGoogleSheetUrl(url);

            // assert
            expect(result?.csvUrl).to.equal(`${EXPORT_BASE}&gid=0`);
        });

        it("handles a bare document link with no action segment", () => {
            // arrange
            const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}`;

            // act
            const result = parseGoogleSheetUrl(url);

            // assert
            expect(result?.csvUrl).to.equal(EXPORT_BASE);
        });

        it("is idempotent for a URL that already requests CSV", () => {
            // arrange
            const url = `${EXPORT_BASE}&gid=2073732512`;

            // act
            const result = parseGoogleSheetUrl(url);

            // assert
            expect(result?.csvUrl).to.equal(url);
        });

        it("converts an export requested in another format to CSV", () => {
            // arrange
            const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx&gid=55`;

            // act
            const result = parseGoogleSheetUrl(url);

            // assert
            expect(result?.csvUrl).to.equal(`${EXPORT_BASE}&gid=55`);
        });

        it("uses the published endpoint for a published-to-web sheet", () => {
            // arrange
            const publishedId = "2PACX-1vQxampleIdWithDashes_and_underscores";
            const url = `https://docs.google.com/spreadsheets/d/e/${publishedId}/pubhtml?gid=99&single=true`;

            // act
            const result = parseGoogleSheetUrl(url);

            // assert
            expect(result?.csvUrl).to.equal(
                `https://docs.google.com/spreadsheets/d/e/${publishedId}/pub?output=csv&gid=99&single=true`
            );
        });

        it("leaves a deliberately chosen Google Charts CSV URL alone", () => {
            // arrange
            const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=7`;

            // act
            const result = parseGoogleSheetUrl(url);

            // assert
            expect(result?.csvUrl).to.equal(url);
        });

        it("names the source after the sheet and tab, since the title is not in the URL", () => {
            // arrange
            const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=2073732512`;

            // act
            const result = parseGoogleSheetUrl(url);

            // assert
            expect(result?.displayName).to.equal("Google Sheet 1DcolQrE.2073732512");
        });

        [
            "https://docs.google.com/document/d/1DcolQrEYpy4AKAxJ/edit", // a Google Doc, not a sheet
            "https://drive.google.com/file/d/1DcolQrEYpy4AKAxJ/view",
            "https://biofile-finder-datasets.s3.us-west-2.amazonaws.com/FMS.provenance.csv",
            "s3://some-bucket/some-file.parquet",
            "not-a-url-at-all",
            "",
        ].forEach((url) => {
            it(`returns undefined for a non-Sheets URI: ${url || "(empty string)"}`, () => {
                expect(parseGoogleSheetUrl(url)).to.equal(undefined);
            });
        });
    });

    describe("isGoogleSheetUri", () => {
        it("recognizes a Sheets URL", () => {
            expect(isGoogleSheetUri(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`)).to.be
                .true;
        });

        it("does not recognize other URLs", () => {
            expect(isGoogleSheetUri("https://example.com/data.csv")).to.be.false;
        });

        it("does not recognize a local file or a missing uri", () => {
            expect(isGoogleSheetUri(undefined)).to.be.false;
            expect(isGoogleSheetUri(new File([], "data.csv"))).to.be.false;
        });
    });
});
