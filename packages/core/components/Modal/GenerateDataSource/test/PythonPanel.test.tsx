import { expect } from "chai";

import { buildSnippet } from "../PythonPanel";

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
