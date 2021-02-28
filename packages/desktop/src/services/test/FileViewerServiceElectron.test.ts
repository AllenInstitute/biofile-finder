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
});
