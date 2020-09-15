import { expect } from "chai";
import { ipcRenderer } from "electron";
import nock from "nock";
import { createSandbox } from "sinon";

import { RUN_IN_RENDERER } from "../../util/constants";
import ApplicationInfoServiceElectron from "../ApplicationInfoServiceElectron";

describe(`${RUN_IN_RENDERER} ApplicationInfoServiceElectron`, () => {
    before(() => {
        // Block all network requests. If a request isn't specifically intercepted by nock,
        // throw a NetConnectNotAllowedError.
        nock.disableNetConnect();
    });

    after(() => {
        // Reset network connection blocking.
        nock.cleanAll();
        nock.enableNetConnect();
    });

    describe("updateAvailable", () => {
        const sandbox = createSandbox();

        afterEach(() => {
            sandbox.restore();
        });

        [
            {
                case: "greater than",
                appVersion: "1.0.0",
                latestReleaseTag: "v1.0.1",
                expectation: true,
            },
            {
                case: "equal to",
                appVersion: "1.0.0",
                latestReleaseTag: "v1.0.0",
                expectation: false,
            },
            {
                case: "less than",
                appVersion: "1.1.0-alpha.1",
                latestReleaseTag: "v1.0.9",
                expectation: false,
            },
        ].forEach((spec) => {
            it(`resolves ${spec.expectation} if latest release is ${spec.case} current build`, async () => {
                // Arrange
                // intercept requests to Github API and return canned response
                const latestGithubReleaseUrl = new URL(
                    ApplicationInfoServiceElectron.LATEST_GITHUB_RELEASE_URL
                );
                nock(latestGithubReleaseUrl.origin)
                    .get(latestGithubReleaseUrl.pathname)
                    .reply(
                        200,
                        JSON.stringify({
                            tag_name: spec.latestReleaseTag,
                        })
                    );

                // intercept ipc request for application version
                sandbox
                    .stub(ipcRenderer, "invoke")
                    .withArgs(ApplicationInfoServiceElectron.GET_APP_VERSION_IPC_CHANNEL)
                    .resolves(spec.appVersion);

                const service = new ApplicationInfoServiceElectron();

                // Act
                const updateAvailable = await service.updateAvailable();

                // Assert
                expect(updateAvailable).to.equal(spec.expectation);
            });
        });
    });
});
