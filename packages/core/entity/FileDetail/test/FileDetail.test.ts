import { expect } from "chai";

import FileDetail from "..";
import { Environment } from "../../../constants";

describe("FileDetail", () => {
    describe("localPath", () => {
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
            expect(fileDetail.localPath).to.equal(
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
            expect(fileDetail.localPath).to.equal(
                `/allen/aics/software/apps/staging/fss/data/${file_name}`
            );
        });
    });
});
