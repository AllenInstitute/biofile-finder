import childProcess from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

import { expect } from "chai";
import { ipcRenderer } from "electron";
import { createSandbox } from "sinon";

import { RUN_IN_RENDERER } from "../../util/constants";
import FileViewerServiceElectron, {
    KNOWN_FOLDERS_IN_ALLEN_DRIVE,
} from "../FileViewerServiceElectron";
import PersistentConfigServiceElectron from "../PersistentConfigServiceElectron";

// GM 9/15/20: This symbol is in fact exported from @aics/fms-file-explorer-core, but inexplicably,
// using `import` machinery causes tests to hang. All attempts to debug this have been unsuccesful so far.
const {
    FileViewerCancellationToken,
} = require("@aics/fms-file-explorer-core/nodejs/services/FileViewerService");
const {
    PersistedDataKeys,
} = require("@aics/fms-file-explorer-core/nodejs/services/PersistentConfigService");

describe(`${RUN_IN_RENDERER} FileViewerServiceElectron`, () => {
    const sandbox = createSandbox();

    afterEach(() => {
        sandbox.restore();
    });

    describe("openFilesInImageJ", () => {
        it("resolves after successfully spawning child process", async () => {
            // Arrange
            const persistentConfigService = new PersistentConfigServiceElectron({
                clearExistingData: true,
            });
            const service = new FileViewerServiceElectron(persistentConfigService);
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
            const persistentConfigService = new PersistentConfigServiceElectron({
                clearExistingData: true,
            });
            const service = new FileViewerServiceElectron(persistentConfigService);
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

    describe("selectAllenMountPoint", () => {
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
            const persistentConfigService = new PersistentConfigServiceElectron({
                clearExistingData: true,
            });
            const service = new FileViewerServiceElectron(persistentConfigService);
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
            const persistedMountPoint = persistentConfigService.get(
                PersistedDataKeys.AllenMountPoint
            );
            expect(persistedMountPoint).to.equal(tempAllenDrive);
        });

        it("does not persist mount point when cancelled", async () => {
            // Arrange
            const persistentConfigService = new PersistentConfigServiceElectron({
                clearExistingData: true,
            });
            const service = new FileViewerServiceElectron(persistentConfigService);
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
            const persistedMountPoint = persistentConfigService.get(
                PersistedDataKeys.AllenMountPoint
            );
            expect(persistedMountPoint).to.be.undefined;
        });

        it("Rejects invalid allen drive & allows reselection of valid drive", async () => {
            // Arrange
            const persistentConfigService = new PersistentConfigServiceElectron({
                clearExistingData: true,
            });
            const service = new FileViewerServiceElectron(persistentConfigService);
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
            const persistedMountPoint = persistentConfigService.get(
                PersistedDataKeys.AllenMountPoint
            );
            expect(persistedMountPoint).to.equal(tempAllenDrive);
        });

        it("informs the user of the prompt (when specified to)", async () => {
            // Arrange
            const persistentConfigService = new PersistentConfigServiceElectron({
                clearExistingData: true,
            });
            const service = new FileViewerServiceElectron(persistentConfigService);
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
        });

        it("doesn't ask for selection when user cancels out of message box", async () => {
            // Arrange
            const persistentConfigService = new PersistentConfigServiceElectron({
                clearExistingData: true,
            });
            const service = new FileViewerServiceElectron(persistentConfigService);
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
        });
    });

    describe("selectImageJExecutableLocation", () => {
        const sandbox = createSandbox();
        const tempImageJPath = path.resolve(os.tmpdir(), "ImageJTestApp.txt");

        beforeEach(async () => {
            await fs.promises.writeFile(tempImageJPath, "", { mode: 111 });
        });

        afterEach(async () => {
            sandbox.restore();
            await fs.promises.unlink(tempImageJPath);
        });

        it("persists Image J executable location", async () => {
            // Arrange
            const persistentConfigService = new PersistentConfigServiceElectron({
                clearExistingData: true,
            });
            const service = new FileViewerServiceElectron(persistentConfigService);
            sandbox
                .stub(ipcRenderer, "invoke")
                .withArgs(FileViewerServiceElectron.SHOW_OPEN_DIALOG)
                .resolves({
                    filePaths: [tempImageJPath],
                });

            // Act
            const mountPoint = await service.selectImageJExecutableLocation();

            // Assert
            expect(mountPoint).to.equal(tempImageJPath);
            const persistedMountPoint = persistentConfigService.get(
                PersistedDataKeys.ImageJExecutable
            );
            expect(persistedMountPoint).to.equal(tempImageJPath);
        });

        it("does not persist location when cancelled", async () => {
            // Arrange
            const persistentConfigService = new PersistentConfigServiceElectron({
                clearExistingData: true,
            });
            const service = new FileViewerServiceElectron(persistentConfigService);
            sandbox
                .stub(ipcRenderer, "invoke")
                .withArgs(FileViewerServiceElectron.SHOW_OPEN_DIALOG)
                .resolves({
                    canceled: true,
                    filePaths: ["/some/path/to/ImageJ"],
                });

            // Act
            const mountPoint = await service.selectImageJExecutableLocation();

            // Assert
            expect(mountPoint).to.equal(FileViewerCancellationToken);
            const persistedMountPoint = persistentConfigService.get(
                PersistedDataKeys.ImageJExecutable
            );
            expect(persistedMountPoint).to.be.undefined;
        });

        it("re-prompts user on invalid Image J path selection", async () => {
            // Arrange
            const persistentConfigService = new PersistentConfigServiceElectron({
                clearExistingData: true,
            });
            const service = new FileViewerServiceElectron(persistentConfigService);
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
            const mountPoint = await service.selectImageJExecutableLocation();

            // Assert
            expect(mountPoint).to.equal(FileViewerCancellationToken);
            const persistedMountPoint = persistentConfigService.get(
                PersistedDataKeys.ImageJExecutable
            );
            expect(persistedMountPoint).to.be.undefined;
        });

        it("informs the user of the prompt (when specified to)", async () => {
            // Arrange
            const persistentConfigService = new PersistentConfigServiceElectron({
                clearExistingData: true,
            });
            const service = new FileViewerServiceElectron(persistentConfigService);
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
        });

        it("doesn't ask for selection when user cancels out of message box", async () => {
            // Arrange
            const persistentConfigService = new PersistentConfigServiceElectron({
                clearExistingData: true,
            });
            const service = new FileViewerServiceElectron(persistentConfigService);
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
            const persistentConfigService = new PersistentConfigServiceElectron({
                clearExistingData: true,
            });
            const service = new FileViewerServiceElectron(persistentConfigService);
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
            const persistentConfigService = new PersistentConfigServiceElectron({
                clearExistingData: true,
            });
            const service = new FileViewerServiceElectron(persistentConfigService);
            await fs.promises.mkdir(tempAllenPath);

            // Act
            const result = await service.isValidAllenMountPoint(tempAllenPath);

            // Assert
            expect(result).to.be.false;
        });

        it("returns false when allen drive itself does not exist", async () => {
            // Arrange
            const persistentConfigService = new PersistentConfigServiceElectron({
                clearExistingData: true,
            });
            const service = new FileViewerServiceElectron(persistentConfigService);

            // Act
            const result = await service.isValidAllenMountPoint(tempAllenPath);

            // Assert
            expect(result).to.be.false;
        });
    });
});
