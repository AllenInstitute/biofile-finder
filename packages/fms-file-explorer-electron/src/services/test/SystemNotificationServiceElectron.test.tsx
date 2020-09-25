import { assert } from "chai";
import { ipcRenderer } from "electron";
import { createSandbox } from "sinon";

import { RUN_IN_RENDERER } from "../../util/constants";
import SystemNotificationServiceElectron from "../SystemNotificationServiceElectron";

describe(`${RUN_IN_RENDERER} SystemNotificationServiceElectron`, () => {
    describe("showErrorMessage", () => {
        const sandbox = createSandbox();

        afterEach(() => {
            sandbox.restore();
        });

        it("triggers error message dialog box", async () => {
            // Arrange
            const service = new SystemNotificationServiceElectron();
            sandbox
                .stub(ipcRenderer, "invoke")
                .withArgs(SystemNotificationServiceElectron.SHOW_ERROR_MESSAGE)
                .resolves();

            // Act / Assert
            await service.showErrorMessage('a test error', 'testing an error');

            // sanity-check
            sandbox.restore();
            sandbox
                .stub(ipcRenderer, "invoke")
                .withArgs(SystemNotificationServiceElectron.SHOW_ERROR_MESSAGE)
                .rejects();
            try {
                await service.showErrorMessage('a test error', 'testing an error');
                assert.fail("Expected error to throw from triggered error box as sanity-check");
            } catch (_) {}
        });
    });
});
