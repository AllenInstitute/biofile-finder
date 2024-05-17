import { expect } from "chai";
import ExecutionEnvServiceWeb from "../ExecutionEnvServiceWeb";

describe("ExecutionEnvServiceWeb", () => {
    const service = new ExecutionEnvServiceWeb();

    describe("formatPathForHost", () => {
        it("is just an identity function", async () => {
            // Arrange
            const input = "/Volumes/programs/object/path.ext";

            // Act
            const actual = await service.formatPathForHost(input);

            // Assert
            expect(actual).to.equal(input);
        });
    });

    describe("promptForExecutable", () => {
        it("throw error", async () => {
            // Act / Assert
            try {
                await service.promptForExecutable();
            } catch (error) {
                expect((error as Error).message).to.equal(
                    "ExecutionEnvServiceWeb::promptForExecutable not yet implemented"
                );
            }
        });
    });

    describe("promptForFile", () => {
        it("throw error", async () => {
            // Act / Assert
            try {
                await service.promptForFile();
            } catch (error) {
                expect((error as Error).message).to.equal(
                    "ExecutionEnvServiceWeb::promptForFile not yet implemented"
                );
            }
        });
    });

    describe("promptForSaveLocation", () => {
        it("throw error", async () => {
            // Act / Assert
            try {
                await service.promptForSaveLocation();
            } catch (error) {
                expect((error as Error).message).to.equal(
                    "ExecutionEnvServiceWeb::promptForSaveLocation not yet implemented"
                );
            }
        });
    });
});
