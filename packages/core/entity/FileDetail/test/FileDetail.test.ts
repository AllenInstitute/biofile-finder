import { expect } from "chai";
import { uniqueId } from "lodash";

import { Environment } from "../../../constants";

import FileDetail from "..";

describe("FileDetail", () => {
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

        it("returns undefined when thumbnail is invalid type", async () => {
            // Arrange
            const thumbnail = "thumbnail.blah";
            const detail = new FileDetail({ ...metadata, thumbnail }, Environment.TEST);

            // Act
            const path = await detail.getPathToThumbnail();

            // Assert
            expect(path).to.be.undefined;
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
