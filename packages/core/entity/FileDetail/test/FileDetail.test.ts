import { expect } from "chai";

import FileDetail from "..";

describe("FileDetail", () => {
    describe("file path representation", () => {
        it("creates downloadPath from /allen path", () => {
            // Arrange
            const relativePath = "path/to/MyFile.txt";

            // Act
            const fileDetail = new FileDetail({
                file_path: `production.files.allencell.org/${relativePath}`,
                annotations: [
                    {
                        name: "Local File Path",
                        values: [`/allen/programs/allencell/data/proj0/${relativePath}`],
                    },
                ],
            });

            // Assert
            expect(fileDetail.downloadPath).to.equal(
                // The downloadPath is HTTP, but will get redirected to HTTPS
                `http://aics.corp.alleninstitute.org/labkey/fmsfiles/image/allen/programs/allencell/data/proj0/${relativePath}`
            );
        });
    });
});
