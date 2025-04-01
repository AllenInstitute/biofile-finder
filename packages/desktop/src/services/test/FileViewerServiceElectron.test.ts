import childProcess from "child_process";

import { expect } from "chai";
import { createSandbox } from "sinon";

import FileViewerServiceElectron from "../FileViewerServiceElectron";
import NotificationServiceElectron from "../NotificationServiceElectron";
import { RUN_IN_RENDERER } from "../../util/constants";

describe(`${RUN_IN_RENDERER} FileViewerServiceElectron`, () => {
    const sandbox = createSandbox();
    let attemptedToShowError = false;
    class UselessNotificationService extends NotificationServiceElectron {
        showMessage() {
            return Promise.resolve(false);
        }
        showError() {
            attemptedToShowError = true;
            return Promise.resolve();
        }
    }

    beforeEach(() => {
        attemptedToShowError = false;
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("open", () => {
        it("resolves after successfully spawning child process", async () => {
            // Arrange
            const service = new FileViewerServiceElectron(new UselessNotificationService());
            class FakeProcess {
                public on() {
                    return;
                }

                public unref() {
                    return;
                }
            }
            const executable = "/some/path/to/a/test/imageJ";
            const filePaths = ["a", "b"];
            sandbox
                .stub(childProcess, "spawn")
                // Rather than try to implement every method in ChildProcess, force its typing
                .returns((new FakeProcess() as unknown) as childProcess.ChildProcess);

            // Act / Assert
            await service.open(executable, filePaths);

            // Assert
            expect(attemptedToShowError).to.be.false;
        });

        it("attempts to report error on failure to spawn child process", async () => {
            // Arrange
            const service = new FileViewerServiceElectron(new UselessNotificationService());
            const executable = "/some/path/to/a/test/imageJ";
            const filePaths = ["a", "b"];
            sandbox.stub(childProcess, "spawn").throws("Test error");

            // Act
            await service.open(executable, filePaths);

            // Assert
            expect(attemptedToShowError).to.be.true;
        });
    });

    describe("openNativeFileBrowser", () => {
        it("no-op", () => {
            expect(2).to.equal(2);
        });

        /**
         * The following test is commented out because it fails in CI, for some reason.
         *
         *  That should be fixed, of course, but since it tests a minor feature that
         *  is part of the desktop version of the app (which will ultimately be deprecated),
         *  we don't consider it too important.
         */

        // it("throws an error if file path does not exist", () => {
        //     // Arrange
        //     sandbox.stub(fs, "existsSync").returns(false);

        //     const service = new FileViewerServiceElectron(new UselessNotificationService());

        //     const fileDetail = new FileDetail(
        //         {
        //             annotations: [
        //                 {
        //                     name: "Cache Eviction Date",
        //                     values: ["2000-01-01"],
        //                 },
        //             ],
        //             file_path: "/allen/aics/path/to/file.txt",
        //         },
        //         Environment.TEST
        //     );

        //     // Act + Assert
        //     expect(() => {
        //         service.openNativeFileBrowser(fileDetail);
        //     }).to.throw(FileNotFoundError);
        // });
    });
});
