import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";

import { expect } from "chai";
import { ipcRenderer } from "electron";
import nock from "nock";
import sinon from "sinon";

import { DownloadFailure } from "../../../../core/errors";
import { DownloadResolution } from "../../../../core/services";
import { RUN_IN_RENDERER } from "../../util/constants";
import FileDownloadServiceElectron from "../FileDownloadServiceElectron";

describe(`${RUN_IN_RENDERER} FileDownloadServiceElectron`, () => {
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

    describe("downloadCsvManifest", () => {
        const tempfile = `${os.tmpdir()}/manifest.csv`;

        beforeEach(async () => {
            if (!nock.isActive()) {
                nock.activate();
            }

            // ensure tempfile exists
            const fd = await fs.promises.open(tempfile, "w+");
            await fd.close();
        });

        afterEach(async () => {
            nock.restore();

            try {
                await fs.promises.unlink(tempfile);
            } catch (err) {
                // if the file doesn't exist (e.g., because it was already cleaned up), ignore. else, re-raise.
                if (err.code !== "ENOENT") {
                    throw err;
                }
            }

            sinon.restore();
        });

        it("saves CSV to a file", async () => {
            // Arrange
            const DOWNLOAD_HOST = "https://aics-test.corp.alleninstitute.org";
            const DOWNLOAD_PATH = "/file-explorer-service/1.0/files/selection/manifest";
            const CSV_BODY =
                "Hello, it's me, I was wondering if after all these years you'd like to meet";

            // intercept request for download and return canned response
            nock(DOWNLOAD_HOST).post(DOWNLOAD_PATH).reply(200, CSV_BODY, {
                "Content-Type": "text/csv;charset=UTF-8",
                "Content-Disposition": "attachment;filename=manifest.csv",
            });

            sinon
                .stub(ipcRenderer, "invoke")
                .withArgs(FileDownloadServiceElectron.GET_FILE_SAVE_PATH)
                .resolves({
                    filePath: tempfile,
                });

            const service = new FileDownloadServiceElectron();

            // Act
            await service.downloadCsvManifest(
                `${DOWNLOAD_HOST}${DOWNLOAD_PATH}`,
                JSON.stringify({ some: "data" }),
                "beepbop"
            );

            // Assert
            expect(await fs.promises.readFile(tempfile, "utf-8")).to.equal(CSV_BODY);
        });

        it("resolves meaningfully if user cancels download when prompted for save path", async () => {
            // Arrange
            sinon
                .stub(ipcRenderer, "invoke")
                .withArgs(FileDownloadServiceElectron.GET_FILE_SAVE_PATH)
                .resolves({
                    canceled: true,
                });

            const service = new FileDownloadServiceElectron();
            const downloadRequestId = "beepbop";

            // Act
            const result = await service.downloadCsvManifest(
                "/some/url",
                JSON.stringify({ some: "data" }),
                downloadRequestId
            );

            // Assert
            expect(result).to.have.property("downloadRequestId", downloadRequestId);
            expect(result).to.have.property("resolution", DownloadResolution.CANCELLED);
        });

        it("rejects with error message and clears partial artifact if request for CSV is unsuccessful", async () => {
            // Arrange
            const DOWNLOAD_HOST = "https://aics-test.corp.alleninstitute.org";
            const DOWNLOAD_PATH = "/file-explorer-service/1.0/files/selection/manifest";
            const ERROR_MSG = "Something went wrong and nobody knows why";

            // intercept request for download and return canned error
            nock(DOWNLOAD_HOST).post(DOWNLOAD_PATH).reply(500, ERROR_MSG);

            sinon
                .stub(ipcRenderer, "invoke")
                .withArgs(FileDownloadServiceElectron.GET_FILE_SAVE_PATH)
                .resolves({
                    filePath: tempfile,
                });

            const service = new FileDownloadServiceElectron();
            const downloadRequestId = "beepbop";

            // Write a partial CSV manifest to enable testing that it is cleaned up on error
            await fs.promises.writeFile(tempfile, "This, That, The Other");

            try {
                // Act
                await service.downloadCsvManifest(
                    `${DOWNLOAD_HOST}${DOWNLOAD_PATH}`,
                    JSON.stringify({ some: "data" }),
                    downloadRequestId
                );

                // Evergreen detector
                throw new assert.AssertionError({
                    message:
                        "FileDownloadServiceElectron::downloadCsvManifest expected to throw on failure",
                });
            } catch (err) {
                // Assert
                expect(err).to.be.instanceOf(DownloadFailure);
                expect(err.message).to.include(ERROR_MSG);
                expect((err as DownloadFailure).downloadIdentifier).to.equal(downloadRequestId);
            } finally {
                // Assert that any partial file is cleaned up
                try {
                    await fs.promises.access(tempfile);
                    throw new assert.AssertionError({ message: `${tempfile} not cleaned up` });
                } catch (err) {
                    // Expect the file to be missing
                    expect(err.code).to.equal("ENOENT", err.message);
                }
            }
        });
    });
});
