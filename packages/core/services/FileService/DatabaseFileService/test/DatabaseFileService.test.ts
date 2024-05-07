import { expect } from "chai";

import FileSelection from "../../../../entity/FileSelection";
import FileSet from "../../../../entity/FileSet";
import NumericRange from "../../../../entity/NumericRange";
import DatabaseServiceNoop from "../../../DatabaseService/DatabaseServiceNoop";

import DatabaseFileService from "..";

describe("DatabaseFileService", () => {
    const totalFileSize = 864452;
    const fileIds = ["abc123", "def456"];
    const files = fileIds.map((file_id) => ({
        "File ID": file_id,
        "File Size": `${totalFileSize / 2}`,
        "File Path": "path/to/file",
        num_files: "6",
    }));

    class MockDatabaseService extends DatabaseServiceNoop {
        public query(): Promise<{ [key: string]: string }[]> {
            return Promise.resolve(files);
        }
    }
    const databaseService = new MockDatabaseService();

    describe("getFiles", () => {
        it("issues request for files that match given parameters", async () => {
            const databaseFileService = new DatabaseFileService({ databaseService });
            const fileSet = new FileSet();
            const response = await databaseFileService.getFiles({
                from: 0,
                limit: 1,
                fileSet,
            });
            const data = response;
            expect(data.length).to.equal(2);
            expect(data[0].details).to.deep.equal({
                annotations: [
                    {
                        name: "File Path",
                        values: ["path/to/file"],
                    },
                    {
                        name: "File Name",
                        values: ["file"],
                    },
                    {
                        name: "File ID",
                        values: ["abc123"],
                    },
                    {
                        name: "File Size",
                        values: ["432226"],
                    },
                    {
                        name: "File ID",
                        values: ["abc123"],
                    },
                    {
                        name: "File Size",
                        values: ["432226"],
                    },
                    {
                        name: "File Path",
                        values: ["path/to/file"],
                    },
                    {
                        name: "num_files",
                        values: ["6"],
                    },
                ],
            });
        });
    });

    describe("getAggregateInformation", () => {
        it("issues request for aggregated information about given files", async () => {
            // Arrange
            const fileService = new DatabaseFileService({ databaseService });
            const selection = new FileSelection().select({
                fileSet: new FileSet({ fileService }),
                index: new NumericRange(0, 1),
                sortOrder: 0,
            });

            // Act
            const { count, size } = await fileService.getAggregateInformation(selection);

            // Assert
            expect(count).to.equal(2);
            expect(size).to.equal(totalFileSize);
        });
    });

    describe("getCountOfMatchingFiles", () => {
        it("issues request for count of files matching given parameters", async () => {
            const fileService = new DatabaseFileService({ databaseService });
            const fileSet = new FileSet();
            const count = await fileService.getCountOfMatchingFiles(fileSet);
            expect(count).to.equal(6);
        });
    });
});
