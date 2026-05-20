import { expect } from "chai";
import { uniqueId } from "lodash";
import sinon from "sinon";

import * as zarrRenderer from "../RenderZarrThumbnailURL";
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
        const renderedOmeZarrThumbnailURL = "zarrThumbnail.png";

        before(() => {
            sinon
                .stub(zarrRenderer, "renderZarrThumbnailURL")
                .returns(Promise.resolve(renderedOmeZarrThumbnailURL));
        });

        afterEach(() => {
            sinon.resetHistory();
        });

        after(() => {
            sinon.restore();
        });

        it("returns thumbnail when .png", async () => {
            // Arrange
            const thumbnail = "thumbnail.png";
            const detail = new FileDetail({ ...metadata, thumbnail }, Environment.TEST);

            // Act
            const path = await detail.getPathToThumbnail();

            // Assert
            expect(path).to.be.equal(thumbnail);
        });

        ["https://idr-example/webclient/render_thumbnail/1921257/", "file.blah"].forEach(
            (thumbnail) => {
                it(`returns thumbnail when unknown type: ${thumbnail}`, async () => {
                    // Arrange
                    const detail = new FileDetail({ ...metadata, thumbnail }, Environment.TEST);

                    // Act
                    const path = await detail.getPathToThumbnail();

                    // Assert
                    expect(path).to.be.equal(thumbnail);
                });
            }
        );

        ["http://thumbnail.zarr", "s3://thumbnail.zarr/"].forEach((thumbnail) => {
            it(`returns rendered zarr thumbnail when .zarr: ${thumbnail}`, async () => {
                // Arrange
                const detail = new FileDetail({ ...metadata, thumbnail }, Environment.TEST);

                // Act
                const path = await detail.getPathToThumbnail();

                // Assert
                expect(path).to.be.equal(renderedOmeZarrThumbnailURL);
            });
        });

        it("returns path when missing thumbnail and path is .png", async () => {
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

        ["http://thumbnail.zarr", "s3://thumbnail.zarr/"].forEach((filePath) => {
            it(`returns rendered zarr thumbnail when missing thumbnail and path is .zarr: ${filePath}`, async () => {
                // Arrange
                const detail = new FileDetail(
                    { ...metadata, file_path: filePath, thumbnail: undefined },
                    Environment.TEST
                );

                // Act
                const path = await detail.getPathToThumbnail();

                // Assert
                expect(path).to.be.equal(renderedOmeZarrThumbnailURL);
            });
        });

        ["https://idr-example/webclient/render_thumbnail/1921257/", "file.blah"].forEach(
            (filePath) => {
                it(`returns undefined when missing thumbnail and path is unknown type: ${filePath}`, async () => {
                    // Arrange
                    const detail = new FileDetail(
                        { ...metadata, file_path: filePath, thumbnail: undefined },
                        Environment.TEST
                    );

                    // Act
                    const path = await detail.getPathToThumbnail();

                    // Assert
                    expect(path).to.be.undefined;
                });
            }
        );
    });
});
