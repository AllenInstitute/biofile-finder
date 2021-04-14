import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { expect } from "chai";
import { ipcRenderer } from "electron";
import { createSandbox } from "sinon";

import { ExecutableEnvCancellationToken } from "./../../../../core/services";
import ExecutionEnvServiceElectron, {
    KNOWN_FOLDERS_IN_ALLEN_DRIVE,
    Platform,
} from "../ExecutionEnvServiceElectron";
import NotificationServiceElectron from "../NotificationServiceElectron";
import { RUN_IN_RENDERER } from "../../util/constants";

describe(`${RUN_IN_RENDERER} ExecutionEnvServiceElectron`, () => {
    const runningOnMacOS = os.platform() === Platform.Mac;

    describe("promptForAllenMountPoint", () => {
        const sandbox = createSandbox();
        const tempAllenDrive = fs.mkdtempSync(`${os.tmpdir()}${path.sep}`);

        beforeEach(() => {
            for (const folder of KNOWN_FOLDERS_IN_ALLEN_DRIVE) {
                fs.mkdirSync(path.resolve(tempAllenDrive, folder), { recursive: true });
            }
        });

        afterEach(() => {
            sandbox.restore();
            fs.rmSync(tempAllenDrive, { recursive: true });
        });

        it("returns mount point as selected", async () => {
            // Arrange
            let wasMessageShown = false;
            class UselessNotificationService extends NotificationServiceElectron {
                showMessage() {
                    wasMessageShown = true;
                    return Promise.resolve(true);
                }
            }
            const service = new ExecutionEnvServiceElectron(new UselessNotificationService());
            sandbox
                .stub(ipcRenderer, "invoke")
                .withArgs(ExecutionEnvServiceElectron.SHOW_OPEN_DIALOG)
                .resolves({
                    filePaths: [tempAllenDrive],
                });

            // Act
            const mountPoint = await service.promptForAllenMountPoint(true);

            // Assert
            expect(mountPoint).to.equal(tempAllenDrive);
            expect(wasMessageShown).to.be.true;
        });

        it("returns cancellation token when message prompt cancelled", async () => {
            // Arrange
            let wasMessageShown = false;
            class UselessNotificationService extends NotificationServiceElectron {
                showMessage() {
                    wasMessageShown = true;
                    return Promise.resolve(false);
                }
            }
            const service = new ExecutionEnvServiceElectron(new UselessNotificationService());

            // Act
            const mountPoint = await service.promptForAllenMountPoint(true);

            // Assert
            expect(mountPoint).to.equal(ExecutableEnvCancellationToken);
            expect(wasMessageShown).to.be.true;
        });

        it("returns cancellation token when browser prompt cancelled", async () => {
            // Arrange
            const service = new ExecutionEnvServiceElectron(new NotificationServiceElectron());
            sandbox
                .stub(ipcRenderer, "invoke")
                .withArgs(ExecutionEnvServiceElectron.SHOW_OPEN_DIALOG)
                .resolves({
                    canceled: true,
                    filePaths: [],
                });

            // Act
            const mountPoint = await service.promptForAllenMountPoint();

            // Assert
            expect(mountPoint).to.equal(ExecutableEnvCancellationToken);
        });

        it("prompts reselection of valid mount point when invalid one is chosen", async () => {
            // Arrange
            let wasErrorShown = false;
            class UselessNotificationService extends NotificationServiceElectron {
                showError() {
                    wasErrorShown = true;
                    return Promise.resolve();
                }
            }
            const service = new ExecutionEnvServiceElectron(new UselessNotificationService());
            const stub = sandbox.stub(ipcRenderer, "invoke");
            stub.withArgs(ExecutionEnvServiceElectron.SHOW_OPEN_DIALOG)
                .onCall(0)
                .resolves({
                    filePaths: ["/some/not/allen/path"],
                });
            stub.withArgs(ExecutionEnvServiceElectron.SHOW_OPEN_DIALOG)
                .onCall(1)
                .resolves({
                    filePaths: [tempAllenDrive],
                });

            // Act
            const mountPoint = await service.promptForAllenMountPoint();

            // Assert
            expect(mountPoint).to.equal(tempAllenDrive);
            expect(wasErrorShown).to.be.true;
        });
    });

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

    describe("isValidAllenMountPoint", () => {
        const tmpDir = fs.mkdtempSync(`${os.tmpdir()}${path.sep}`);
        const tempAllenPath = path.join(tmpDir, "/test-allen");
        const knownPaths = KNOWN_FOLDERS_IN_ALLEN_DRIVE.map((f) => path.resolve(tempAllenPath, f));

        afterEach(() => {
            fs.rmSync(tempAllenPath, { recursive: true, force: true });
        });

        it("returns true when allen drive is valid", async () => {
            // Arrange
            const service = new ExecutionEnvServiceElectron(new NotificationServiceElectron());
            for (const expectedFolder of knownPaths) {
                fs.mkdirSync(path.resolve(tempAllenPath, expectedFolder), { recursive: true });
            }

            // Act
            const result = await service.isValidAllenMountPoint(tempAllenPath);

            // Assert
            expect(result).to.be.true;
        });

        it("returns false when allen drive does not contain expected folder", async () => {
            // Arrange
            const service = new ExecutionEnvServiceElectron(new NotificationServiceElectron());
            fs.mkdirSync(tempAllenPath);

            // Act
            const result = await service.isValidAllenMountPoint(tempAllenPath);

            // Assert
            expect(result).to.be.false;
        });

        it("returns false when allen drive itself does not exist", async () => {
            // Arrange
            const service = new ExecutionEnvServiceElectron(new NotificationServiceElectron());

            // Act
            const result = await service.isValidAllenMountPoint(tempAllenPath);

            // Assert
            expect(result).to.be.false;
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
            fs.rmSync(tmpDir, { recursive: true, force: true });
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
    });
});
