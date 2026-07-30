import { expect } from "chai";
import ExecutionEnvServiceWeb from "../ExecutionEnvServiceWeb";

describe("ExecutionEnvServiceWeb", () => {
    const service = new ExecutionEnvServiceWeb();

    describe("formatPathForHost", () => {
        it("returns the POSIX path unchanged on non-Windows", async () => {
            // Arrange
            const input = "/allen/programs/allencell/fms/object.foo";

            // Act
            const actual = await service.formatPathForHost(input);

            // Assert
            expect(actual).to.equal(input);
        });

        it("converts POSIX path to UNC path on Windows", async () => {
            // Arrange
            const originalNavigator = global.navigator;
            (global as any).navigator = {
                userAgent:
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            };

            // Act
            const actual = await service.formatPathForHost(
                "/allen/programs/allencell/fms/object.foo"
            );

            // Restore
            (global as any).navigator = originalNavigator;

            // Assert
            expect(actual).to.equal(String.raw`\\allen\programs\allencell\fms\object.foo`);
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
