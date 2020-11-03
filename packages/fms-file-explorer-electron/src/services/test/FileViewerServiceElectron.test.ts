import childProcess from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as util from "util";

import { assert, expect } from "chai";
import { ipcRenderer } from "electron";
import plistParser from "simple-plist";
import { createSandbox } from "sinon";

import { RUN_IN_RENDERER } from "../../util/constants";
import FileViewerServiceElectron, {
    KNOWN_FOLDERS_IN_ALLEN_DRIVE,
} from "../FileViewerServiceElectron";

// GM 9/15/20: This symbol is in fact exported from @aics/fms-file-explorer-core, but inexplicably,
// using `import` machinery causes tests to hang. All attempts to debug this have been unsuccesful so far.
const {
    FileViewerCancellationToken,
} = require("@aics/fms-file-explorer-core/nodejs/services/FileViewerService");
const { persistent } = require("@aics/fms-file-explorer-core/nodejs/state");

describe(`${RUN_IN_RENDERER} FileViewerServiceElectron`, () => {
    const sandbox = createSandbox();

    afterEach(() => {
        sandbox.restore();
    });

    describe("Open files in ImageJ", () => {
        it("resolves after successfully spawning child process", async () => {
            // Arrange
            const service = new FileViewerServiceElectron();
            class FakeProcess {
                public on() {
                    return;
                }
            }
            const imageJExecutable = "/some/path/to/a/test/imageJ";
            const filePaths = ["a", "b"];
            sandbox
                .stub(childProcess, "spawn")
                // Rather than try to implement every method in ChildProcess, force its typing
                .returns((new FakeProcess() as unknown) as childProcess.ChildProcess);
            const errorBoxStub = sandbox
                .stub(ipcRenderer, "invoke")
                .withArgs(FileViewerServiceElectron.SHOW_ERROR_BOX);

            // Act / Assert
            await service.openFilesInImageJ(filePaths, imageJExecutable);

            // Assert
            expect(errorBoxStub.called).to.be.false;
        });

        it("attempts to report error on failure to spawn child process", async () => {
            // Arrange
            const service = new FileViewerServiceElectron();
            const imageJExecutable = "/some/path/to/a/test/imageJ";
            const filePaths = ["a", "b"];
            sandbox.stub(childProcess, "spawn").throws("Test error");
            const errorBoxStub = sandbox
                .stub(ipcRenderer, "invoke")
                .withArgs(FileViewerServiceElectron.SHOW_ERROR_BOX);

            // Act
            await service.openFilesInImageJ(filePaths, imageJExecutable);

            // Assert
            expect(errorBoxStub.called).to.be.true;
        });
    });

    describe("Select Allen drive mount point", () => {
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

        it("persists mount point", async () => {
            // Arrange
            const service = new FileViewerServiceElectron();
            const dispatchStub = sandbox.stub();
            service.initialize(dispatchStub);
            sandbox
                .stub(ipcRenderer, "invoke")
                .withArgs(FileViewerServiceElectron.SHOW_OPEN_DIALOG)
                .resolves({
                    filePaths: [tempAllenDrive],
                });

            // Act
            const mountPoint = await service.selectAllenMountPoint();

            // Assert
            expect(mountPoint).to.equal(tempAllenDrive);
            expect(dispatchStub.called).to.be.true;
            expect(
                dispatchStub.calledOnceWithExactly(
                    persistent.actions.setAllenMountPoint(tempAllenDrive)
                )
            ).to.be.true;
        });

        it("does not persist mount point when cancelled", async () => {
            // Arrange
            const service = new FileViewerServiceElectron();
            const dispatchStub = sandbox.stub();
            service.initialize(dispatchStub);
            sandbox
                .stub(ipcRenderer, "invoke")
                .withArgs(FileViewerServiceElectron.SHOW_OPEN_DIALOG)
                .resolves({
                    canceled: true,
                    filePaths: [],
                });

            // Act
            const mountPoint = await service.selectAllenMountPoint();

            // Assert
            expect(mountPoint).to.equal(FileViewerCancellationToken);
            expect(dispatchStub.called).to.be.false;
        });

        it("rejects invalid allen drive & allows reselection of valid drive", async () => {
            // Arrange
            const service = new FileViewerServiceElectron();
            const dispatchStub = sandbox.stub();
            service.initialize(dispatchStub);
            const stub = sandbox.stub(ipcRenderer, "invoke");
            stub.withArgs(FileViewerServiceElectron.SHOW_OPEN_DIALOG)
                .onCall(0)
                .resolves({
                    filePaths: ["/some/not/allen/path"],
                });
            stub.withArgs(FileViewerServiceElectron.SHOW_OPEN_DIALOG)
                .onCall(1)
                .resolves({
                    filePaths: [tempAllenDrive],
                });

            // Act
            const mountPoint = await service.selectAllenMountPoint();

            // Assert
            expect(mountPoint).to.equal(tempAllenDrive);
            expect(dispatchStub.called).to.be.true;
            expect(
                dispatchStub.calledOnceWithExactly(
                    persistent.actions.setAllenMountPoint(tempAllenDrive)
                )
            ).to.be.true;
        });

        it("informs the user of the prompt (when specified to)", async () => {
            // Arrange
            const service = new FileViewerServiceElectron();
            const dispatchStub = sandbox.stub();
            service.initialize(dispatchStub);
            const invokeStub = sandbox.stub(ipcRenderer, "invoke");
            const selectDirectoryStub = invokeStub.withArgs(
                FileViewerServiceElectron.SHOW_OPEN_DIALOG
            );
            selectDirectoryStub.resolves({
                canceled: true,
                filePaths: ["/some/path/to/allen"],
            });
            const messageBoxStub = invokeStub.withArgs(FileViewerServiceElectron.SHOW_MESSAGE_BOX);
            messageBoxStub.resolves(true);

            // Act
            const mountPoint = await service.selectAllenMountPoint(true);

            // Assert
            expect(mountPoint).to.equal(FileViewerCancellationToken);
            expect(messageBoxStub.called).to.be.true;
            expect(selectDirectoryStub.called).to.be.true;
            expect(dispatchStub.called).to.be.false;
        });

        it("doesn't ask for selection when user cancels out of message box", async () => {
            // Arrange
            const service = new FileViewerServiceElectron();
            const dispatchStub = sandbox.stub();
            service.initialize(dispatchStub);
            const invokeStub = sandbox.stub(ipcRenderer, "invoke");
            const selectDirectoryStub = invokeStub.withArgs(
                FileViewerServiceElectron.SHOW_OPEN_DIALOG
            );
            const messageBoxStub = invokeStub.withArgs(FileViewerServiceElectron.SHOW_MESSAGE_BOX);
            messageBoxStub.resolves(false);
            // Act
            const mountPoint = await service.selectAllenMountPoint(true);

            // Assert
            expect(mountPoint).to.equal(FileViewerCancellationToken);
            expect(messageBoxStub.called).to.be.true;
            expect(selectDirectoryStub.called).to.be.false;
            expect(dispatchStub.called).to.be.false;
        });

        it("reports error when not initialize", async () => {
            // Arrange
            const service = new FileViewerServiceElectron();

            // Act / Assert
            try {
                await service.selectAllenMountPoint(true);
                assert.fail("Should have failed due to not setting up instance");
            } catch (error) {}
        });
    });

    describe("Select ImageJ executable location", () => {
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

        it("persists ImageJ executable location", async () => {
            // Arrange
            const service = new FileViewerServiceElectron();
            const dispatchStub = sandbox.stub();
            service.initialize(dispatchStub);
            const invokeStub = sandbox.stub(ipcRenderer, "invoke");
            invokeStub.withArgs(FileViewerServiceElectron.SHOW_MESSAGE_BOX).resolves(true);
            invokeStub.withArgs(FileViewerServiceElectron.SHOW_OPEN_DIALOG).resolves({
                filePaths: [executablePath],
            });
            invokeStub
                .withArgs(FileViewerServiceElectron.SHOW_ERROR_BOX)
                .throws("You broke the test.");

            // Act
            const selectedPath = await service.selectImageJExecutableLocation();

            // Assert
            if (runningOnMacOS) {
                expect(selectedPath).to.equal(macOSExecutablePath);
            } else {
                expect(selectedPath).to.equal(executablePath);
            }
            expect(dispatchStub.called).to.be.true;
            expect(
                dispatchStub.calledOnceWithExactly(
                    persistent.actions.setImageJLocation(selectedPath)
                )
            ).to.be.true;
        });

        it("does not persist location when cancelled", async () => {
            // Arrange
            const service = new FileViewerServiceElectron();
            const dispatchStub = sandbox.stub();
            service.initialize(dispatchStub);
            sandbox
                .stub(ipcRenderer, "invoke")
                .withArgs(FileViewerServiceElectron.SHOW_OPEN_DIALOG)
                .resolves({
                    canceled: true,
                    filePaths: ["/some/path/to/ImageJ"],
                });

            // Act
            const selectedPath = await service.selectImageJExecutableLocation();

            // Assert
            expect(selectedPath).to.equal(FileViewerCancellationToken);
            expect(dispatchStub.called).to.be.false;
        });

        it("re-prompts user on invalid ImageJ path selection", async () => {
            // Arrange
            const service = new FileViewerServiceElectron();
            const dispatchStub = sandbox.stub();
            service.initialize(dispatchStub);
            const selectDirectoryStub = sandbox
                .stub(ipcRenderer, "invoke")
                .withArgs(FileViewerServiceElectron.SHOW_OPEN_DIALOG);
            selectDirectoryStub.onCall(0).resolves({
                filePaths: ["/some/path/to/ImageJ"],
            });
            selectDirectoryStub.onCall(1).resolves({
                canceled: true,
                filePaths: ["/some/path/to/ImageJ"],
            });

            // Act
            const selectedPath = await service.selectImageJExecutableLocation();

            // Assert
            expect(selectedPath).to.equal(FileViewerCancellationToken);
            expect(dispatchStub.called).to.be.false;
        });

        it("informs the user of the prompt (when specified to)", async () => {
            // Arrange
            const service = new FileViewerServiceElectron();
            const dispatchStub = sandbox.stub();
            service.initialize(dispatchStub);
            const invokeStub = sandbox.stub(ipcRenderer, "invoke");
            const selectDirectoryStub = invokeStub.withArgs(
                FileViewerServiceElectron.SHOW_OPEN_DIALOG
            );
            selectDirectoryStub.resolves({
                canceled: true,
                filePaths: ["/some/path/to/ImageJ"],
            });
            const messageBoxStub = invokeStub.withArgs(FileViewerServiceElectron.SHOW_MESSAGE_BOX);
            messageBoxStub.resolves(true);

            // Act
            const mountPoint = await service.selectImageJExecutableLocation(true);

            // Assert
            expect(mountPoint).to.equal(FileViewerCancellationToken);
            expect(messageBoxStub.called).to.be.true;
            expect(selectDirectoryStub.called).to.be.true;
            expect(dispatchStub.called).to.be.false;
        });

        it("doesn't ask for selection when user cancels out of message box", async () => {
            // Arrange
            const service = new FileViewerServiceElectron();
            const dispatchStub = sandbox.stub();
            service.initialize(dispatchStub);
            const invokeStub = sandbox.stub(ipcRenderer, "invoke");
            const selectDirectoryStub = invokeStub.withArgs(
                FileViewerServiceElectron.SHOW_OPEN_DIALOG
            );
            const messageBoxStub = invokeStub.withArgs(FileViewerServiceElectron.SHOW_MESSAGE_BOX);
            messageBoxStub.resolves(false);

            // Act
            const mountPoint = await service.selectImageJExecutableLocation(true);

            // Assert
            expect(mountPoint).to.equal(FileViewerCancellationToken);
            expect(messageBoxStub.called).to.be.true;
            expect(selectDirectoryStub.called).to.be.false;
            expect(dispatchStub.called).to.be.false;
        });

        it("reports error when not initialize", async () => {
            // Arrange
            const service = new FileViewerServiceElectron();

            // Act / Assert
            try {
                await service.selectImageJExecutableLocation(true);
                assert.fail("Should have failed due to not setting up instance");
            } catch (error) {}
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
            const service = new FileViewerServiceElectron();
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
            const service = new FileViewerServiceElectron();
            await fs.promises.mkdir(tempAllenPath);

            // Act
            const result = await service.isValidAllenMountPoint(tempAllenPath);

            // Assert
            expect(result).to.be.false;
        });

        it("returns false when allen drive itself does not exist", async () => {
            // Arrange
            const service = new FileViewerServiceElectron();

            // Act
            const result = await service.isValidAllenMountPoint(tempAllenPath);

            // Assert
            expect(result).to.be.false;
        });
    });

    describe("getDefaultAllenMountPointForOs", () => {
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

        it("returns valid default allen drive for OS", async () => {
            // Arrange
            const service = new FileViewerServiceElectron();
            const dispatchStub = sandbox.stub();
            service.initialize(dispatchStub);
            await fs.promises.mkdir(tempAllenPath);
            for (const expectedFolder of knownPaths) {
                await fs.promises.mkdir(path.resolve(tempAllenPath, expectedFolder));
            }

            // Act
            const result = await service.getDefaultAllenMountPointForOs();

            // Assert
            if (os.platform() === "win32") {
                expect(result).to.equal(tempAllenPath);
            } else {
                expect(result).to.be.undefined;
            }
            expect(dispatchStub.called).to.be.true;
            expect(dispatchStub.calledWithExactly(result)).to.be.true;
        });
    });

    describe("isValidImageJLocation", () => {
        const imageJExecutable = path.resolve(os.tmpdir(), "testExecutable");

        before(async () => {
            await fs.promises.writeFile(imageJExecutable, "hello", { mode: 111 });
            await fs.promises.access(imageJExecutable, fs.constants.X_OK);
        });

        after(async () => {
            await fs.promises.unlink(imageJExecutable);
        });

        it("returns true when valid", async () => {
            // Arrange
            const service = new FileViewerServiceElectron();

            // Act
            const result = await service.isValidImageJLocation(imageJExecutable);

            // Assert
            expect(result).to.true;
        });

        it("returns false when given location does not exist", async () => {
            // Arrange
            const service = new FileViewerServiceElectron();

            // Act
            const result = await service.isValidImageJLocation("/a/non/existent/path/imagej");

            // Assert
            expect(result).to.be.false;
        });
    });
});
