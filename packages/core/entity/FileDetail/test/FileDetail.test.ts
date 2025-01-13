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
                // The downloadPath is HTTP, but will get redirected to HTTPS
                `http://aics.corp.alleninstitute.org/labkey/fmsfiles/image/allen/programs/allencell/data/proj0/36f/e16/9ff/d36/532/6d9/441/66e/eed/2e3/c3/${file_name}`
            );
        });
    });
});
