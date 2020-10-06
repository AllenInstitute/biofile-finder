import childProcess from "child_process";

import { expect } from "chai";
import { ipcRenderer } from "electron";
import { createSandbox } from "sinon";

import { RUN_IN_RENDERER } from "../../util/constants";
import FileViewerServiceElectron from "../FileViewerServiceElectron";
import PersistentConfigServiceElectron from "../PersistentConfigServiceElectron";

describe(`${RUN_IN_RENDERER} FileViewerServiceElectron`, () => {
    const sandbox = createSandbox();

    afterEach(() => {
        sandbox.restore();
    });

    describe("openFilesInImageJ", () => {
        it("resolves after successfully spawning child process", async () => {
            // Arrange
            class FakeProcess {
                public on() {
                    return;
                }
            }
            const imageJExecutable = "/some/path/to/a/test/imageJ";
            const filePaths = ['a', 'b'];
            const service = new FileViewerServiceElectron();
            sandbox
                .stub(childProcess, "spawn")
                // Rather than try to implement every method in ChildProcess, force its typing
                .returns(new FakeProcess() as unknown as childProcess.ChildProcess);
            const errorBoxStub = sandbox
                .stub(ipcRenderer, "invoke")
                .withArgs(PersistentConfigServiceElectron.SHOW_ERROR_BOX);

            // Act / Assert
            await service.openFilesInImageJ(filePaths, imageJExecutable);

            // Assert
            expect(errorBoxStub.called).to.be.false;
            
        });

        it("attempts to report error on failure to spawn child process", async () => {
            // Arrange
            const imageJExecutable = "/some/path/to/a/test/imageJ";
            const filePaths = ['a', 'b'];
            const service = new FileViewerServiceElectron();
            sandbox
                .stub(childProcess, "spawn")
                .throws("Test error");
            const errorBoxStub = sandbox
                .stub(ipcRenderer, "invoke")
                .withArgs(PersistentConfigServiceElectron.SHOW_ERROR_BOX);

            // Act
            await service.openFilesInImageJ(filePaths, imageJExecutable);

            // Assert
            expect(errorBoxStub.called).to.be.true;
        });
    });
});
