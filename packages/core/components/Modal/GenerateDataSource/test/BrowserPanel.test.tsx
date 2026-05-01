import { expect } from "chai";

import { buildCsvFromBrowserFiles, filterFilesByPattern } from "../BrowserPanel";

// ---------------------------------------------------------------------------
// Helper: create a mock File with webkitRelativePath
// ---------------------------------------------------------------------------
function mockFile(relativePath: string, size = 1024): File {
    const parts = relativePath.split("/");
    const name = parts[parts.length - 1];
    const file = new File(["x"], name, { type: "application/octet-stream" });
    Object.defineProperty(file, "size", { value: size });
    Object.defineProperty(file, "webkitRelativePath", { value: relativePath });
    return file;
}

// ---------------------------------------------------------------------------
// filterFilesByPattern tests
// ---------------------------------------------------------------------------

describe("filterFilesByPattern", () => {
    it("returns all files when pattern has no extension hint", () => {
        const files = [mockFile("folder/a.tif"), mockFile("folder/b.csv")];
        expect(filterFilesByPattern(files, "**/*").length).to.equal(2);
    });

    it("filters to matching extension", () => {
        const files = [
            mockFile("folder/a.tif"),
            mockFile("folder/b.csv"),
            mockFile("folder/c.tif"),
        ];
        const result = filterFilesByPattern(files, "**/*.tif");
        expect(result.length).to.equal(2);
        expect(result.every((f) => f.name.endsWith(".tif"))).to.be.true;
    });

    it("is case-insensitive for extensions", () => {
        const files = [mockFile("folder/a.TIF"), mockFile("folder/b.tif")];
        expect(filterFilesByPattern(files, "**/*.tif").length).to.equal(2);
    });
});

// ---------------------------------------------------------------------------
// buildCsvFromBrowserFiles tests
// ---------------------------------------------------------------------------

describe("buildCsvFromBrowserFiles", () => {
    it("produces a header row with File Path as first column", () => {
        const fl = [mockFile("myFolder/a.tif")];
        const csv = buildCsvFromBrowserFiles(fl, "**/*", "");
        const header = csv.split("\n")[0];
        expect(header.startsWith("File Path")).to.be.true;
    });

    it("includes File Name and File Size columns", () => {
        const fl = [mockFile("myFolder/a.tif")];
        const csv = buildCsvFromBrowserFiles(fl, "**/*", "");
        const header = csv.split("\n")[0];
        expect(header).to.include("File Name");
        expect(header).to.include("File Size");
    });

    it("extracts named groups as columns", () => {
        const fl = [mockFile("myFolder/CDH2/lineA/img.tif")];
        const csv = buildCsvFromBrowserFiles(fl, "**/*", "(?P<gene>[^/]+)/(?P<cell_line>[^/]+)");
        const header = csv.split("\n")[0];
        expect(header).to.include("gene");
        expect(header).to.include("cell_line");
        const row = csv.split("\n")[1];
        expect(row).to.include("CDH2");
        expect(row).to.include("lineA");
    });

    it("accepts JS-style named groups as well", () => {
        const fl = [mockFile("myFolder/CDH2/img.tif")];
        const csv = buildCsvFromBrowserFiles(fl, "**/*", "(?<gene>[^/]+)/");
        const header = csv.split("\n")[0];
        expect(header).to.include("gene");
    });

    it("filters files by pattern", () => {
        const fl = [mockFile("folder/a.tif"), mockFile("folder/b.csv")];
        const csv = buildCsvFromBrowserFiles(fl, "**/*.tif", "");
        const lines = csv.split("\n").filter(Boolean);
        // 1 header + 1 data row
        expect(lines.length).to.equal(2);
        expect(lines[1]).to.include("a.tif");
    });

    it("returns only header when no files match pattern", () => {
        const fl = [mockFile("folder/b.csv")];
        const csv = buildCsvFromBrowserFiles(fl, "**/*.tif", "");
        const lines = csv.split("\n").filter(Boolean);
        expect(lines.length).to.equal(1);
    });

    it("escapes commas in values", () => {
        const file = mockFile("folder/my,file.tif");
        const fl = [file];
        const csv = buildCsvFromBrowserFiles(fl, "**/*", "");
        expect(csv).to.include('"my,file.tif"');
    });
});
