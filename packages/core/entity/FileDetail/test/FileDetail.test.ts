import { expect } from "chai";
import { uniqueId } from "lodash";

import { Environment } from "../../../constants";

import FileDetail, { FmsFile } from "..";
import { MetadataValue } from "../../../services/FileService";

describe("FileDetail", () => {
    describe("getAnnotation", () => {
        const makeDetail = (key: string, values: MetadataValue): FileDetail =>
            new FileDetail(
                {
                    annotations: [
                        { name: "test", values: ["123"] },
                        { name: key, values },
                        { name: "copycat", values },
                        { name: "tree", values: [{ branch: [{ leaf: ["green"] }] }] },
                    ],
                },
                Environment.TEST
            );

        it("returns appropriate value when simple string value", () => {
            const color = ["Green"];
            expect(makeDetail("Color", color).getAnnotation(["Color"])).to.deep.equal(color);
        });

        it("returns appropriate value when simple number value", () => {
            const year = [1999];
            expect(makeDetail("Year", year).getAnnotation(["Year"])).to.deep.equal(year);
        });

        it("returns the raw root value for a single-segment path", () => {
            const well = [{ Dose: [{ Unit: ["mg"] }] }];
            expect(makeDetail("Well", well).getAnnotation(["Well"])).to.deep.equal(well);
        });

        it("returns the raw value via metadata.get for a plain string name", () => {
            const well = [{ Dose: [{ Unit: ["mg"] }] }];
            expect(makeDetail("Well", well).getAnnotation("Well")).to.deep.equal(well);
        });

        it("returns undefined for an empty path", () => {
            expect(makeDetail("Well", []).getAnnotation([])).to.be.undefined;
        });

        it("traverses a multi-segment path to collect leaf values", () => {
            const well = [{ Dose: [{ Unit: ["mg"] }] }];
            expect(makeDetail("Well", well).getAnnotation(["Well", "Dose", "Unit"])).to.deep.equal([
                "mg",
            ]);
        });

        it("deduplicates leaf values collected across multiple nested entries", () => {
            const well = [
                { Dose: [{ Unit: ["mg"] }] },
                { Dose: [{ Unit: ["mg"] }, { Unit: ["mL"] }] },
            ];
            expect(makeDetail("Well", well).getAnnotation(["Well", "Dose", "Unit"])).to.deep.equal([
                "mg",
                "mL",
            ]);
        });

        it("returns undefined when an intermediate segment is missing from every entry", () => {
            const well = [{ Dose: [{ Unit: ["mg"] }] }];
            expect(makeDetail("Well", well).getAnnotation(["Well", "Dose", "Concentration"])).to.be
                .undefined;
        });

        it("returns undefined when the root column is absent", () => {
            const detail = new FileDetail(
                { annotations: [{ name: "Other", values: ["x"] }] } as FmsFile,
                Environment.TEST
            );
            expect(detail.getAnnotation(["Well", "Dose", "Unit"])).to.be.undefined;
        });
    });

    describe("getPathToThumbnail", () => {
        const metadata = {
            annotations: [],
            file_path: uniqueId() + ".png",
            file_id: uniqueId(),
            file_name: "MyFile.png",
            file_size: 7,
            uploaded: "01/01/01",
        };

        it("returns thumbnail when .png", async () => {
            // Arrange
            const thumbnail = "thumbnail.png";
            const detail = new FileDetail({ ...metadata, thumbnail }, Environment.TEST);

            // Act
            const path = await detail.getPathToThumbnail();

            // Assert
            expect(path).to.be.equal(thumbnail);
        });

        // Need .zarr in test files to test since file gets touched
        it.skip("returns thumbnail when .zarr", async () => {
            // Arrange
            const thumbnail = "thumbnail.zarr";
            const detail = new FileDetail({ ...metadata, thumbnail }, Environment.TEST);

            // Act
            const path = await detail.getPathToThumbnail();

            // Assert
            expect(path).to.be.equal(thumbnail);
        });

        it("returns path when missing thumbnail and is .png", async () => {
            // Arrange
            const filePath = "file.png";
            const detail = new FileDetail(
                { ...metadata, file_path: filePath, thumbnail: undefined },
                Environment.TEST
            );

            // Act
            const path = await detail.getPathToThumbnail();

            // Assert
            expect(path).to.be.equal(filePath);
        });

        // Need .zarr in test files to test since file gets touched
        it.skip("returns path when missing thumbnail and is .zarr", async () => {
            // Arrange
            const filePath = "file.zarr";
            const detail = new FileDetail(
                { ...metadata, file_path: filePath, thumbnail: undefined },
                Environment.TEST
            );

            // Act
            const path = await detail.getPathToThumbnail();

            // Assert
            expect(path).to.be.equal(filePath);
        });

        it("returns the thumbnail as-is when its type is unknown", async () => {
            // Arrange
            const thumbnail = "thumbnail.blah";
            const detail = new FileDetail({ ...metadata, thumbnail }, Environment.TEST);

            // Act
            const path = await detail.getPathToThumbnail();

            // Assert
            expect(path).to.be.equal(thumbnail);
        });

        it("returns undefined when path is invalid type and thumbnail missing", async () => {
            // Arrange
            const filePath = "file.blah";
            const detail = new FileDetail(
                { ...metadata, file_path: filePath, thumbnail: undefined },
                Environment.TEST
            );

            // Act
            const path = await detail.getPathToThumbnail();

            // Assert
            expect(path).to.be.undefined;
        });
    });
});
