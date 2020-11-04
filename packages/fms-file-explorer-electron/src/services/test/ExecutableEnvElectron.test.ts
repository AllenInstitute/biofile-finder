import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as util from "util";

import { expect } from "chai";
import { ipcRenderer } from "electron";
import { createSandbox } from "sinon";

import ExecutableEnvServiceElectron, {
    KNOWN_FOLDERS_IN_ALLEN_DRIVE,
} from "../ExecutableEnvServiceElectron";
import NotificationServiceElectron from "../NotificationServiceElectron";
import { RUN_IN_RENDERER } from "../../util/constants";

const {
    ExecutableEnvCancellationToken,
} = require("@aics/fms-file-explorer-core/nodejs/services/ExecutableEnvService");

describe(`${RUN_IN_RENDERER} ExecutableEnvServiceElectron`, () => {
    describe("promptForAllenMountPoint", () => {
        const sandbox = createSandbox();
        const tempAllenDrive = path.resolve(os.tmpdir(), "testAllenDir");

        beforeEach(async () => {
            await fs.promises.mkdir(tempAllenDrive);
            for (const folder of KNOWN_FOLDERS_IN_ALLEN_DRIVE) {
                await fs.promises.mkdir(path.resolve(tempAllenDrive, folder));
            }
        });

        afterEach(async () => {
            sandbox.restore();
            // While recursive removal is experimental manually empty the tempAllenDrive
            for (const folder of KNOWN_FOLDERS_IN_ALLEN_DRIVE) {
                await fs.promises.rmdir(path.resolve(tempAllenDrive, folder));
            }
            await fs.promises.rmdir(tempAllenDrive);
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
            const service = new ExecutableEnvServiceElectron(new UselessNotificationService());
            sandbox
                .stub(ipcRenderer, "invoke")
                .withArgs(ExecutableEnvServiceElectron.SHOW_OPEN_DIALOG)
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
            const service = new ExecutableEnvServiceElectron(new UselessNotificationService());

            // Act
            const mountPoint = await service.promptForAllenMountPoint(true);

            // Assert
            expect(mountPoint).to.equal(ExecutableEnvCancellationToken);
            expect(wasMessageShown).to.be.true;
        });

        it("returns cancellation token when browser prompt cancelled", async () => {
            // Arrange
            const service = new ExecutableEnvServiceElectron(new NotificationServiceElectron());
            sandbox
                .stub(ipcRenderer, "invoke")
                .withArgs(ExecutableEnvServiceElectron.SHOW_OPEN_DIALOG)
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
            const service = new ExecutableEnvServiceElectron(new UselessNotificationService());
            const stub = sandbox.stub(ipcRenderer, "invoke");
            stub.withArgs(ExecutableEnvServiceElectron.SHOW_OPEN_DIALOG)
                .onCall(0)
                .resolves({
                    filePaths: ["/some/not/allen/path"],
                });
            stub.withArgs(ExecutableEnvServiceElectron.SHOW_OPEN_DIALOG)
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
        const runningOnMacOS = os.platform() === "darwin";
        const executablePath = path.resolve(os.tmpdir(), "ImageJTest");
        const macOSExecutable = "ImageJTest-macosx";
        const macOSExecutablePath = path.resolve(
            executablePath,
            ...["Contents", "MacOS", macOSExecutable]
        );

        beforeEach(async () => {
            if (runningOnMacOS) {
                // !!! IMPLEMENTATION DETAIL !!!
                // On macOS, packages are actually directories, and the callable executables live within those packages.
                // The name of the executable is declared in the Info.plist file. So, if running this test on macOS, need to ensure
                // there is both an Info.plist as well as the nested executable.
                const macOSPackage = path.resolve(executablePath, ...["Contents", "MacOS"]);
                const infoPlistPath = path.resolve(executablePath, ...["Contents", "Info.plist"]);

                await fs.promises.mkdir(macOSPackage, { recursive: true });
                const plistParser = await import("simple-plist");
                const promisifiedPlistWriter = util.promisify(plistParser.writeFile);
                await promisifiedPlistWriter(infoPlistPath, {
                    CFBundleExecutable: macOSExecutable,
                });
                const fd = await fs.promises.open(macOSExecutablePath, "w", 0o777);
                await fd.close();
            } else {
                const fd = await fs.promises.open(executablePath, "w", 0o777);
                await fd.close();
            }
        });

        afterEach(async () => {
            sandbox.restore();

            const stats = await fs.promises.stat(executablePath);
            if (stats.isDirectory()) {
                await fs.promises.rmdir(executablePath, { recursive: true });
            } else {
                await fs.promises.unlink(executablePath);
            }
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
            const service = new ExecutableEnvServiceElectron(
                new UselessNotificationServiceElectron()
            );
            const invokeStub = sandbox.stub(ipcRenderer, "invoke");
            invokeStub.withArgs(ExecutableEnvServiceElectron.SHOW_OPEN_DIALOG).resolves({
                filePaths: [executablePath],
            });

            // Act
            const selectedPath = await service.promptForExecutable(
                "ImageJ/Fiji",
                "Select ImageJ or Fiji"
            );

            // Assert
            if (runningOnMacOS) {
                expect(selectedPath).to.equal(macOSExecutablePath);
            } else {
                expect(selectedPath).to.equal(executablePath);
            }
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
            const service = new ExecutableEnvServiceElectron(
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
            const service = new ExecutableEnvServiceElectron(
                new UselessNotificationServiceElectron()
            );
            sandbox
                .stub(ipcRenderer, "invoke")
                .withArgs(ExecutableEnvServiceElectron.SHOW_OPEN_DIALOG)
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
            const service = new ExecutableEnvServiceElectron(new UselessNotificationService());
            const selectDirectoryStub = sandbox
                .stub(ipcRenderer, "invoke")
                .withArgs(ExecutableEnvServiceElectron.SHOW_OPEN_DIALOG);
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
        const tempAllenPath = path.resolve(os.tmpdir(), "testAllen");
        const knownPaths = KNOWN_FOLDERS_IN_ALLEN_DRIVE.map((f) => path.resolve(tempAllenPath, f));

        afterEach(async () => {
            // Make sure the folders get cleaned up after each test (if they exist)
            for (const folder of [...knownPaths, tempAllenPath]) {
                let exists = false;
                try {
                    await fs.promises.access(folder, fs.constants.F_OK);
                    exists = true;
                } catch (_) {}
                if (exists) {
                    await fs.promises.rmdir(folder);
                }
            }
        });

        it("returns true when allen drive is valid", async () => {
            // Arrange
            const service = new ExecutableEnvServiceElectron(new NotificationServiceElectron());
            await fs.promises.mkdir(tempAllenPath);
            for (const expectedFolder of knownPaths) {
                await fs.promises.mkdir(path.resolve(tempAllenPath, expectedFolder));
            }

            // Act
            const result = await service.isValidAllenMountPoint(tempAllenPath);

            // Assert
            expect(result).to.be.true;
        });

        it("returns false when allen drive does not contain expected folder", async () => {
            // Arrange
            const service = new ExecutableEnvServiceElectron(new NotificationServiceElectron());
            await fs.promises.mkdir(tempAllenPath);

            // Act
            const result = await service.isValidAllenMountPoint(tempAllenPath);

            // Assert
            expect(result).to.be.false;
        });

        it("returns false when allen drive itself does not exist", async () => {
            // Arrange
            const service = new ExecutableEnvServiceElectron(new NotificationServiceElectron());

            // Act
            const result = await service.isValidAllenMountPoint(tempAllenPath);

            // Assert
            expect(result).to.be.false;
        });
    });

    describe("isValidExecutable", () => {
        const executable = path.resolve(os.tmpdir(), "testExecutable");

        before(async () => {
            await fs.promises.writeFile(executable, "hello", { mode: 111 });
            await fs.promises.access(executable, fs.constants.X_OK);
        });

        after(async () => {
            await fs.promises.unlink(executable);
        });

        it("returns true when valid", async () => {
            // Arrange
            const service = new ExecutableEnvServiceElectron(new NotificationServiceElectron());

            // Act
            const result = await service.isValidExecutable(executable);

            // Assert
            expect(result).to.be.true;
        });

        it("returns false when given location does not exist", async () => {
            // Arrange
            const service = new ExecutableEnvServiceElectron(new NotificationServiceElectron());

            // Act
            const result = await service.isValidExecutable("/a/non/existent/path/imagej");

            // Assert
            expect(result).to.be.false;
        });
    });
});
