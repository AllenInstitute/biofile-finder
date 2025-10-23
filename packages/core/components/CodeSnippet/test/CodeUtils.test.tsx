import { expect } from "chai";
import { detectBioioPlugins } from "../../CodeSnippet/CodeUtils";

describe("detectBioioPlugins", () => {
    it("detects and sorts unique plugins across multiple files", () => {
        const paths = [
            "/data/sample1.tif",
            "/data/sample2.TIFF",
            "/data/scan.czi",
            "/data/also-czi.CZI",
        ];
        // Expected unique + sorted
        expect(detectBioioPlugins(paths)).to.deep.equal(["bioio-czi", "bioio-ome-tiff"]);
    });

    it("is case-insensitive and de-dupes within the same plugin", () => {
        const paths = ["/x/A.TIF", "/x/B.tif", "/x/C.TiF", "/x/D.tIf"];
        expect(detectBioioPlugins(paths)).to.deep.equal(["bioio-ome-tiff"]);
    });

    it("handles Windows-style paths and mixed case", () => {
        const paths = ["C:\\images\\EXP01\\Slide01.OME.TIFF", "D:\\raw\\Zstack.nd2"];
        expect(detectBioioPlugins(paths)).to.deep.equal(["bioio-nd2", "bioio-ome-tiff"]);
    });

    it("returns [] for unknown extensions", () => {
        const paths = ["/tmp/readme.txt", "/tmp/custom.dat"];
        expect(detectBioioPlugins(paths)).to.deep.equal([]);
    });
});
