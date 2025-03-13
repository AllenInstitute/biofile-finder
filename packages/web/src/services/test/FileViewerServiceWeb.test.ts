import { expect } from "chai";

import FileViewerServiceWeb from "../FileViewerServiceWeb";

describe("FileViewerServiceWeb", () => {
    describe("open", () => {
        it("throws error (not implemented)", async () => {
            // Arrange
            const service = new FileViewerServiceWeb();

            // Act / Assert
            try {
                await service.open();
            } catch (error) {
                expect((error as Error).message).to.equal(
                    "FileViewerServiceWeb::open is not yet implemented"
                );
            }
        });
    });

    describe("openNativeFileBrowser", () => {
        it("throws error (not implemented)", () => {
            // Arrange
            const service = new FileViewerServiceWeb();

            // Act / Assert
            try {
                service.openNativeFileBrowser();
            } catch (error) {
                expect((error as Error).message).to.equal(
                    "FileViewerServiceWeb::openNativeFileBrowser not yet implemented"
                );
            }
        });
    });
});
