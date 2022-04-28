import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { expect } from "chai";
import { ipcRenderer } from "electron";
import { createSandbox } from "sinon";

import {
    ExecutableEnvCancellationToken,
    SystemDefaultAppLocation,
} from "./../../../../core/services";
import ExecutionEnvServiceElectron, { Platform } from "../ExecutionEnvServiceElectron";
import NotificationServiceElectron from "../NotificationServiceElectron";
import { RUN_IN_RENDERER } from "../../util/constants";

describe(`${RUN_IN_RENDERER} ExecutionEnvServiceElectron`, () => {
    const runningOnMacOS = os.platform() === Platform.Mac;

    describe("promptForExecutable", () => {
        const sandbox = createSandbox();
        const tmpDir = fs.mkdtempSync(`${os.tmpdir()}${path.sep}`);
        const executablePath = runningOnMacOS
            ? path.resolve(tmpDir, "ImageJTest.app")
            : path.resolve(tmpDir, "ImageJTest");

        beforeEach(() => {
            if (runningOnMacOS) {
                // !!! IMPLEMENTATION DETAIL !!!
                // On macOS, packages are actually directories, and the callable executables live within those packages.
                // So, if running this test on macOS, need to ensure the app selected ends with the appropriate app
                // bundle extension ".app" & is a directory
                fs.mkdirSync(executablePath, { recursive: true });
            } else {
                fs.openSync(executablePath, "w", 0o777);
            }
        });

        afterEach(() => {
            sandbox.restore();
            fs.rmSync(executablePath, { recursive: true });
        });

        it("returns executable as selected", async () => {
            // Arrange
            let wasMessageShown = false;
            let wasErrorShown = false;
            class UselessNotificationServiceElectron extends NotificationServiceElectron {
                showMessage() {
                    wasMessageShown = true;
                    return Promise.resolve(true);
                }
                showError() {
                    wasErrorShown = true;
                    return Promise.resolve();
                }
            }
            const service = new ExecutionEnvServiceElectron(
                new UselessNotificationServiceElectron()
            );
            const invokeStub = sandbox.stub(ipcRenderer, "invoke");
            invokeStub.withArgs(ExecutionEnvServiceElectron.SHOW_OPEN_DIALOG).resolves({
                filePaths: [executablePath],
            });

            // Act
            const selectedPath = await service.promptForExecutable(
                "ImageJ/Fiji",
                "Select ImageJ or Fiji"
            );

            // Assert
            expect(selectedPath).to.equal(executablePath);
            expect(wasMessageShown).to.be.true;
            expect(wasErrorShown).to.be.false;
        });

        it("returns cancellation token when message prompt cancelled", async () => {
            // Arrange
            let wasMessageShown = false;
            let wasErrorShown = false;
            class UselessNotificationServiceElectron extends NotificationServiceElectron {
                showMessage() {
                    wasMessageShown = true;
                    return Promise.resolve(false);
                }
                showError() {
                    wasErrorShown = true;
                    return Promise.resolve();
                }
            }
            const service = new ExecutionEnvServiceElectron(
                new UselessNotificationServiceElectron()
            );

            // Act
            const selectedPath = await service.promptForExecutable(
                "Notes",
                "Select Notes executable"
            );

            // Assert
            expect(selectedPath).to.equal(ExecutableEnvCancellationToken);
            expect(wasMessageShown).to.be.true;
            expect(wasErrorShown).to.be.false;
        });

        it("returns cancellation token when browser prompt cancelled", async () => {
            // Arrange
            let wasMessageShown = false;
            let wasErrorShown = false;
            class UselessNotificationServiceElectron extends NotificationServiceElectron {
                showMessage() {
                    wasMessageShown = true;
                    return Promise.resolve(true);
                }
                showError() {
                    wasErrorShown = true;
                    return Promise.resolve();
                }
            }
            const service = new ExecutionEnvServiceElectron(
                new UselessNotificationServiceElectron()
            );
            sandbox
                .stub(ipcRenderer, "invoke")
                .withArgs(ExecutionEnvServiceElectron.SHOW_OPEN_DIALOG)
                .resolves({
                    canceled: true,
                    filePaths: ["/some/path/to/ImageJ"],
                });

            // Act
            const selectedPath = await service.promptForExecutable(
                "Notes",
                "Select Notes executable"
            );

            // Assert
            expect(selectedPath).to.equal(ExecutableEnvCancellationToken);
            expect(wasMessageShown).to.be.true;
            expect(wasErrorShown).to.be.false;
        });

        it("prompts reselection of valid executable when invalid one is chosen", async () => {
            // Arrange
            let wasErrorShown = false;
            class UselessNotificationService extends NotificationServiceElectron {
                showError() {
                    wasErrorShown = true;
                    return Promise.resolve();
                }
            }
            const service = new ExecutionEnvServiceElectron(new UselessNotificationService());
            const selectDirectoryStub = sandbox
                .stub(ipcRenderer, "invoke")
                .withArgs(ExecutionEnvServiceElectron.SHOW_OPEN_DIALOG);
            selectDirectoryStub.onCall(0).resolves({
                filePaths: ["/some/path/to/ImageJ"],
            });
            selectDirectoryStub.onCall(1).resolves({
                filePaths: [executablePath],
            });

            // Act
            const selectedPath = await service.promptForExecutable("Select ImageJ/Fiji");

            // Assert
            expect(selectedPath).to.equal(executablePath);
            expect(wasErrorShown).to.be.true;
        });
    });

    describe("isValidExecutable", () => {
        const tmpDir = fs.mkdtempSync(`${os.tmpdir()}${path.sep}`);
        const executable = runningOnMacOS
            ? path.resolve(tmpDir, "TestExecutable.app")
            : path.resolve(tmpDir, "TestExecutable");

        before(() => {
            if (runningOnMacOS) {
                fs.mkdirSync(executable, { recursive: true });
            } else {
                fs.openSync(executable, "w", 0o777);
            }
        });

        after(() => {
            fs.rmSync(executable, { recursive: true, force: true });
        });

        it("returns true when valid", async () => {
            // Arrange
            const service = new ExecutionEnvServiceElectron(new NotificationServiceElectron());

            // Act
            const result = await service.isValidExecutable(executable);

            // Assert
            expect(result).to.be.true;
        });

        it("returns false when given location does not exist", async () => {
            // Arrange
            const service = new ExecutionEnvServiceElectron(new NotificationServiceElectron());

            // Act
            const result = await service.isValidExecutable("/a/non/existent/path/imagej");

            // Assert
            expect(result).to.be.false;
        });

        it("returns true if path is alias for system default value", async () => {
            // Arrange
            const service = new ExecutionEnvServiceElectron(new NotificationServiceElectron());

            // Act
            const result = await service.isValidExecutable(SystemDefaultAppLocation);

            // Assert
            expect(result).to.be.true;
        });
    });
});
