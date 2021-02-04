import { expect } from "chai";
import nock from "nock";

import { EnvVars, RUN_IN_RENDERER } from "../../util/constants";
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
        beforeEach(() => {
            if (!nock.isActive()) {
                nock.activate();
            }
        });

        afterEach(() => {
            nock.restore();
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

                process.env[EnvVars.ApplicationVersion] = spec.appVersion;

                const service = new ApplicationInfoServiceElectron();

                // Act
                const updateAvailable = await service.updateAvailable();

                // Assert
                expect(updateAvailable).to.equal(spec.expectation);
            });
        });

        describe("getApplicationVersion", () => {
            const expectedAppVersion = "7.X.155";

            before(() => {
                process.env[EnvVars.ApplicationVersion] = expectedAppVersion;
            });

            it("returns application version from ipcRenderer", async () => {
                // Arrange
                const service = new ApplicationInfoServiceElectron();

                // Act
                const version = await service.getApplicationVersion();

                // Assert
                expect(version).to.equal(expectedAppVersion);
            });
        });
    });
});
