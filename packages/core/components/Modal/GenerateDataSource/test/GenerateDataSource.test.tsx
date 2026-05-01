import { render, fireEvent } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";

import GenerateDataSource, {
    buildSnippet,
    buildCsvFromBrowserFiles,
    filterFilesByPattern,
} from "..";

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
// UI tests
// ---------------------------------------------------------------------------

describe("<GenerateDataSource />", () => {
    const noop = () => undefined;

    it("renders the modal with folder path input (Python tab)", () => {
        const { getByPlaceholderText } = render(<GenerateDataSource onDismiss={noop} />);
        expect(getByPlaceholderText("/data/my_images")).to.exist;
    });

    it("shows default glob pattern", () => {
        const { getAllByRole } = render(<GenerateDataSource onDismiss={noop} />);
        const textboxes = getAllByRole("textbox") as HTMLInputElement[];
        const patternInput = textboxes.find((t) => t.value === "**/*");
        expect(patternInput, "file pattern input with default **/*").to.exist;
    });

    it("shows default output file", () => {
        const { getAllByRole } = render(<GenerateDataSource onDismiss={noop} />);
        const textboxes = getAllByRole("textbox") as HTMLInputElement[];
        const outputInput = textboxes.find((t) => t.value === "inventory.csv");
        expect(outputInput, "output file input with default inventory.csv").to.exist;
    });

    it("generates code that includes the entered folder path", () => {
        const { getByPlaceholderText, getByText } = render(<GenerateDataSource onDismiss={noop} />);
        fireEvent.change(getByPlaceholderText("/data/my_images"), {
            target: { value: "/my/folder" },
        });
        expect(getByText(/\/my\/folder/)).to.exist;
    });

    it("generates code that includes pathlib.glob with pattern", () => {
        const { getByText } = render(<GenerateDataSource onDismiss={noop} />);
        expect(getByText(/FOLDER\.glob/)).to.exist;
    });

    it("shows bioio block when BioIO checkbox is checked", () => {
        const { getByRole, getByText } = render(<GenerateDataSource onDismiss={noop} />);
        fireEvent.click(getByRole("checkbox"));
        expect(getByText(/BioImage/)).to.exist;
    });

    it("generates parquet save call when output file has .parquet extension", () => {
        const { getByDisplayValue, getByText } = render(<GenerateDataSource onDismiss={noop} />);
        fireEvent.change(getByDisplayValue("inventory.csv"), {
            target: { value: "output.parquet" },
        });
        expect(getByText(/to_parquet/)).to.exist;
    });

    it("switches to browser mode when the browser tab is clicked", () => {
        const { getByText, getAllByText } = render(<GenerateDataSource onDismiss={noop} />);
        const browserTab = getByText(/Parse folder in browser/i);
        fireEvent.click(browserTab);
        // The hint text appears in the browser panel
        const hints = getAllByText(/Select a local folder/i);
        expect(hints.length).to.be.greaterThan(0);
    });

    it("shows the folder picker button in browser mode", () => {
        const { getByText } = render(<GenerateDataSource onDismiss={noop} />);
        fireEvent.click(getByText(/Parse folder in browser/i));
        expect(getByText(/Select folder/i)).to.exist;
    });
});

// ---------------------------------------------------------------------------
// buildSnippet tests
// ---------------------------------------------------------------------------

describe("buildSnippet", () => {
    it("includes PATH_REGEX block when pathRegex is supplied", () => {
        const { code } = buildSnippet({
            folderPath: "/data",
            filePattern: "**/*",
            pathRegex: "(?P<gene>[^/]+)",
            useBioio: false,
            outputFile: "inventory.csv",
            detectedPlugins: [],
        });
        expect(code).to.include("PATH_REGEX");
        expect(code).to.include("(?P<gene>[^/]+)");
    });

    it("omits PATH_REGEX when pathRegex is empty", () => {
        const { code } = buildSnippet({
            folderPath: "/data",
            filePattern: "**/*",
            pathRegex: "",
            useBioio: false,
            outputFile: "inventory.csv",
            detectedPlugins: [],
        });
        expect(code).to.not.include("PATH_REGEX");
        expect(code).to.include("def parse_path");
        expect(code).to.include("return {}");
    });

    it("omits PATH_REGEX when pathRegex is invalid", () => {
        const { code } = buildSnippet({
            folderPath: "/data",
            filePattern: "**/*",
            pathRegex: "(?P<unclosed",
            useBioio: false,
            outputFile: "inventory.csv",
            detectedPlugins: [],
        });
        expect(code).to.not.include("PATH_REGEX");
    });

    it("uses to_parquet for .parquet output", () => {
        const { code } = buildSnippet({
            folderPath: "/data",
            filePattern: "**/*.parquet",
            pathRegex: "",
            useBioio: false,
            outputFile: "output.parquet",
            detectedPlugins: [],
        });
        expect(code).to.include("to_parquet");
    });

    it("uses to_json for .json output", () => {
        const { code } = buildSnippet({
            folderPath: "/data",
            filePattern: "**/*",
            pathRegex: "",
            useBioio: false,
            outputFile: "output.json",
            detectedPlugins: [],
        });
        expect(code).to.include("to_json");
    });

    it("includes BioImage when useBioio is true", () => {
        const { code, setup } = buildSnippet({
            folderPath: "/data",
            filePattern: "**/*",
            pathRegex: "",
            useBioio: true,
            outputFile: "inventory.csv",
            detectedPlugins: ["bioio-ome-tiff"],
        });
        expect(code).to.include("BioImage");
        expect(setup).to.include("bioio");
        expect(setup).to.include("bioio-ome-tiff");
    });

    it("includes File Path as first column", () => {
        const { code } = buildSnippet({
            folderPath: "/data",
            filePattern: "**/*",
            pathRegex: "",
            useBioio: false,
            outputFile: "inventory.csv",
            detectedPlugins: [],
        });
        expect(code).to.include('"File Path"');
    });

    it("uses placeholder folder when folderPath is empty", () => {
        const { code } = buildSnippet({
            folderPath: "",
            filePattern: "**/*",
            pathRegex: "",
            useBioio: false,
            outputFile: "inventory.csv",
            detectedPlugins: [],
        });
        expect(code).to.include("/path/to/your/folder");
    });
});

// ---------------------------------------------------------------------------
// filterFilesByPattern tests
// ---------------------------------------------------------------------------

describe("filterFilesByPattern", () => {
    it("returns all files when pattern has no extension hint", () => {
        const files = [mockFile("folder/a.tif"), mockFile("folder/b.csv")];
        expect(filterFilesByPattern(files, "**/*").length).to.equal(2);
    });

    it("filters to matching extension", () => {
        const files = [mockFile("folder/a.tif"), mockFile("folder/b.csv"), mockFile("folder/c.tif")];
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


