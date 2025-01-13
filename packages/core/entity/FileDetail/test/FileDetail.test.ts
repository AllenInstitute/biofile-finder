import { expect } from "chai";
import FileDetail from "..";
import { Environment } from "../../../constants";

describe("FileDetail", () => {
    describe("file path representation", () => {
        it("creates downloadPath from /allen path", () => {
            // Arrange
            const file_name = "MyFile.txt";
            const file_id = "c32e3eed66e4416d9532d369ffe1636f";

            // Act
            const fileDetail = new FileDetail(
                {
                    file_path: `production.files.allencell.org/${file_name}`,
                    file_name: file_name,
                    file_id: file_id,
                    annotations: [{ name: "Cache Eviction Date", values: ["SOME DATE"] }],
                },
                Environment.PRODUCTION
            );

            // Assert
            expect(fileDetail.downloadPath).to.equal(
                `http://aics.corp.alleninstitute.org/labkey/fmsfiles/image/allen/programs/allencell/data/proj0/36f/e16/9ff/d36/532/6d9/441/66e/eed/2e3/c3/${file_name}`
            );
        });
    });

    describe("convertAicsDrivePathToAicsS3Path", () => {
        it("converts a local drive path to an S3 path", () => {
            // Arrange
            const localPath = "/allen/programs/allencell/data/proj0/my/folder/file.txt";

            // Act
            const s3Path = FileDetail["convertAicsDrivePathToAicsS3Path"](localPath);

            // Assert
            expect(s3Path).to.equal(
                "https://s3.us-west-2.amazonaws.com/production.files.allencell.org/my/folder/file.txt"
            );
        });
    });

    describe("generateFilePath", () => {
        it("generates a file path based on environment, file name, and FMS ID", () => {
            // Arrange
            const env = Environment.PRODUCTION;
            const fileName = "example.txt";
            const fmsId = "c32e3eed66e4416d9532d369ffe1636f";

            // Act
            const filePath = FileDetail["generateFilePath"](env, fileName, fmsId);

            // Assert
            expect(filePath).to.equal(
                "/allen/programs/allencell/data/proj0/36f/e16/9ff/d36/532/6d9/441/66e/eed/2e3/c3/example.txt"
            );
        });

        it("throws an error for invalid environment", () => {
            // Arrange
            const invalidEnv = "INVALID_ENV" as Environment;

            // Act and Assert
            expect(() =>
                FileDetail["generateFilePath"](invalidEnv, "example.txt", "some-id")
            ).to.throw("Invalid environment: INVALID_ENV");
        });
    });

    describe("convertFMSIDToLocalPath", () => {
        it("converts an FMS ID to a local path representation", () => {
            // Arrange
            const fmsId = "c32e3eed66e4416d9532d369ffe1636f";

            // Act
            const pathSegments = FileDetail["convertFMSIDToLocalPath"](fmsId);

            // Assert
            expect(pathSegments).to.deep.equal([
                "36f",
                "e16",
                "9ff",
                "d36",
                "532",
                "6d9",
                "441",
                "66e",
                "eed",
                "2e3",
                "c3",
            ]);
        });

        it("throws an error for an empty GUID", () => {
            // Arrange
            const emptyGuid = "";

            // Act and Assert
            expect(() => FileDetail["convertFMSIDToLocalPath"](emptyGuid)).to.throw(
                "GUID cannot be null or undefined"
            );
        });
    });

    describe("getLastNChars", () => {
        it("returns the last N characters of a string", () => {
            // Arrange
            const str = "abcdef";
            const numChars = 3;

            // Act
            const result = FileDetail["getLastNChars"](numChars, str);

            // Assert
            expect(result).to.equal("def");
        });

        it("returns the entire string if it is shorter than N", () => {
            // Arrange
            const str = "abc";
            const numChars = 5;

            // Act
            const result = FileDetail["getLastNChars"](numChars, str);

            // Assert
            expect(result).to.equal("abc");
        });

        it("returns an empty string if the input is empty", () => {
            // Arrange
            const str = "";
            const numChars = 3;

            // Act
            const result = FileDetail["getLastNChars"](numChars, str);

            // Assert
            expect(result).to.equal("");
        });
    });
});
