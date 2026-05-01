import { render, fireEvent } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";

import GenerateDataSource, { buildSnippet } from "..";

describe("<GenerateDataSource />", () => {
    const noop = () => undefined;

    it("renders the modal with folder path input", () => {
        const { getByPlaceholderText } = render(<GenerateDataSource onDismiss={noop} />);
        expect(getByPlaceholderText("/data/my_images")).to.exist;
    });

    it("shows default glob pattern", () => {
        const { getAllByRole } = render(<GenerateDataSource onDismiss={noop} />);
        const textboxes = getAllByRole("textbox") as HTMLInputElement[];
        // Second textbox is the file pattern
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

        // The code snippet should contain the folder path
        expect(getByText(/\/my\/folder/)).to.exist;
    });

    it("generates code that includes pathlib.glob with pattern", () => {
        const { getByText } = render(<GenerateDataSource onDismiss={noop} />);
        // Default pattern **/* should appear in the code snippet
        expect(getByText(/FOLDER\.glob/)).to.exist;
    });

    it("shows bioio block when BioIO checkbox is checked", () => {
        const { getByRole, getByText } = render(<GenerateDataSource onDismiss={noop} />);

        const bioioCheckbox = getByRole("checkbox");
        fireEvent.click(bioioCheckbox);

        expect(getByText(/BioImage/)).to.exist;
    });

    it("generates parquet save call when output file has .parquet extension", () => {
        const { getByDisplayValue, getByText } = render(<GenerateDataSource onDismiss={noop} />);

        fireEvent.change(getByDisplayValue("inventory.csv"), {
            target: { value: "output.parquet" },
        });

        expect(getByText(/to_parquet/)).to.exist;
    });
});

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

