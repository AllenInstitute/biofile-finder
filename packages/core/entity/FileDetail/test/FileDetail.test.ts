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
                `http://aics.corp.alleninstitute.org/labkey/fmsfiles/image/allen/programs/allencell/data/proj0/${file_name}`
            );
        });
    });

    describe("getLocalPath", () => {
        it("creates localPath correctly for production environment", () => {
            // Arrange
            const file_name = "ProdFile.czi";
            const file_id = "abc123";
            const file_path = `production.files.allencell.org/${file_name}`;

            // Act
            const fileDetail = new FileDetail(
                {
                    file_path: file_path,
                    file_name: file_name,
                    file_id: file_id,
                    annotations: [{ name: "Cache Eviction Date", values: ["SOME DATE"] }],
                },
                Environment.PRODUCTION
            );

            // Assert
            expect(fileDetail.getLocalPath()).to.equal(
                `/allen/programs/allencell/data/proj0/${file_name}`
            );
        });

        it("creates localPath correctly for staging environment", () => {
            // Arrange
            const file_name = "StagingFile.czi";
            const file_id = "stg123";
            const file_path = `staging.files.allencell.org/${file_name}`;

            // Act
            const fileDetail = new FileDetail(
                {
                    file_path: file_path,
                    file_name: file_name,
                    file_id: file_id,
                    annotations: [{ name: "Cache Eviction Date", values: ["SOME DATE"] }],
                },
                Environment.STAGING
            );

            // Assert
            expect(fileDetail.getLocalPath()).to.equal(
                `/allen/aics/software/apps/staging/fss/data/${file_name}`
            );
        });
    });
});
