import * as assert from "assert";
import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as util from "util";

import { expect } from "chai";
import { ipcRenderer } from "electron";
import nock from "nock";
import sinon from "sinon";

import { DownloadFailure } from "../../../../core/errors";
import { DownloadResolution } from "../../../../core/services";
import { FileDownloadServiceBaseUrl, RUN_IN_RENDERER } from "../../util/constants";
import FileDownloadServiceElectron from "../FileDownloadServiceElectron";
import NotificationServiceElectron from "../NotificationServiceElectron";

function parseRangeHeader(rangeHeader: string): { start: number; end: number } {
    const [, range] = rangeHeader.split("=");
    const [start, end] = range.split("-");
    return { start: Number(start), end: Number(end) };
}

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
                const typedErr = err as NodeJS.ErrnoException;
                if (typedErr.code !== "ENOENT") {
                    throw err;
                }
            }

            sinon.restore();
        });

        it("saves CSV to a file", async () => {
            // Arrange
            const DOWNLOAD_HOST = "https://aics-test.corp.alleninstitute.org";
            const DOWNLOAD_PATH = "/file-explorer-service/2.0/files/selection/manifest";
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

            const service = new FileDownloadServiceElectron(new NotificationServiceElectron());

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

            const service = new FileDownloadServiceElectron(new NotificationServiceElectron());
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
            const DOWNLOAD_PATH = "/file-explorer-service/2.0/files/selection/manifest";
            const ERROR_MSG = "Something went wrong and nobody knows why";

            // intercept request for download and return canned error
            nock(DOWNLOAD_HOST).post(DOWNLOAD_PATH).reply(500, ERROR_MSG);

            sinon
                .stub(ipcRenderer, "invoke")
                .withArgs(FileDownloadServiceElectron.GET_FILE_SAVE_PATH)
                .resolves({
                    filePath: tempfile,
                });

            const service = new FileDownloadServiceElectron(new NotificationServiceElectron());
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
                expect((err as DownloadFailure).message).to.include(ERROR_MSG);
                expect((err as DownloadFailure).downloadIdentifier).to.equal(downloadRequestId);
            } finally {
                // Assert that any partial file is cleaned up
                try {
                    await fs.promises.access(tempfile);
                    throw new assert.AssertionError({ message: `${tempfile} not cleaned up` });
                } catch (err) {
                    // Expect the file to be missing
                    const typedErr = err as NodeJS.ErrnoException;
                    expect(typedErr.code).to.equal("ENOENT", typedErr.message);
                }
            }
        });
    });

    describe("getDefaultDownloadDirectory", () => {
        it("blah", () => {
            expect(false).to.be.true;
        });
    });

    describe("promptForDownloadDirectory", () => {
        it("fdsaf", () => {
            expect(false).to.be.true;
        });
    });

    describe("downloadFile", () => {
        let tempdir: string;
        let sourceFile: string;

        beforeEach(async () => {
            if (!nock.isActive()) {
                nock.activate();
            }

            tempdir = await fs.promises.mkdtemp(`${os.tmpdir()}${path.sep}`);
            sourceFile = path.join(tempdir, "source.txt");

            const sourceFileLength = 1024 * 1024 * 10; // 10MB; big enough to accept a few range requests
            const buf = await util.promisify<Buffer, Buffer>(crypto.randomFill)(
                Buffer.alloc(sourceFileLength)
            );
            await fs.promises.writeFile(sourceFile, buf);
        });

        afterEach(async () => {
            nock.cleanAll();
            nock.restore();
            sinon.restore();

            await fs.promises.rm(tempdir, { recursive: true });
        });

        it("downloads a file", async () => {
            // Arrange
            const downloadHost = "https://aics-test.corp.alleninstitute.org/labkey/fmsfiles/image";
            const fileName = "image.czi";
            const filePath = `/some/path/${fileName}`;

            // intercept request for download and return canned response
            nock(downloadHost)
                .persist()
                .get(filePath)
                .reply(206, function () {
                    const { range } = this.req.headers;
                    const { start, end } = parseRangeHeader(range);
                    return fs.createReadStream(sourceFile, { start, end });
                });

            sinon
                .stub(ipcRenderer, "invoke")
                .withArgs(FileDownloadServiceElectron.GET_DOWNLOADS_DIR)
                .resolves(tempdir);

            const service = new FileDownloadServiceElectron(
                new NotificationServiceElectron(),
                downloadHost as FileDownloadServiceBaseUrl
            );
            const downloadRequestId = "beepbop";
            const expectedDownloadPath = path.join(tempdir, fileName);

            const sourceFileHash = crypto.createHash("md5");
            sourceFileHash.update(await fs.promises.readFile(sourceFile));
            const expectedMD5 = sourceFileHash.digest("hex");

            const fileInfo = {
                id: "abc123",
                name: fileName,
                path: filePath,
                size: (await fs.promises.stat(sourceFile)).size,
            };

            // Act
            const result = await service.downloadFile(fileInfo, destination, downloadRequestId);

            // Assert
            expect(result.resolution).to.equal(DownloadResolution.SUCCESS);

            const downloadedFileHash = crypto.createHash("md5");
            downloadedFileHash.update(await fs.promises.readFile(expectedDownloadPath));
            expect(downloadedFileHash.digest("hex")).to.equal(expectedMD5);
        });

        it("calls onProgress handler", async () => {
            // Arrange
            const downloadHost = "https://aics-test.corp.alleninstitute.org/labkey/fmsfiles/image";
            const fileName = "image.czi";
            const filePath = `/some/path/${fileName}`;

            // intercept request for download and return canned response
            let callCount = 0;
            nock(downloadHost)
                .persist()
                .get(filePath)
                .reply(206, function () {
                    const { range } = this.req.headers;
                    const { start, end } = parseRangeHeader(range);
                    callCount += 1;
                    return fs.createReadStream(sourceFile, { start, end });
                });

            sinon
                .stub(ipcRenderer, "invoke")
                .withArgs(FileDownloadServiceElectron.GET_DOWNLOADS_DIR)
                .resolves(tempdir);

            const service = new FileDownloadServiceElectron(
                new NotificationServiceElectron(),
                downloadHost as FileDownloadServiceBaseUrl
            );
            const downloadRequestId = "beepbop";
            const onProgressSpy = sinon.spy();
            const fileInfo = {
                id: "abc123",
                name: fileName,
                path: filePath,
                size: (await fs.promises.stat(sourceFile)).size,
            };

            // Act
            const result = await service.downloadFile(
                fileInfo,
                undefined,
                downloadRequestId,
                onProgressSpy
            );

            // Assert
            expect(result.resolution).to.equal(DownloadResolution.SUCCESS);
            expect(onProgressSpy.called).to.equal(true);
            expect(onProgressSpy.callCount).to.equal(callCount);
        });

        it("cancels a download and cleans up after itself", async () => {
            // Arrange
            const downloadHost = "https://aics-test.corp.alleninstitute.org/labkey/fmsfiles/image";
            const fileName = "image.czi";
            const filePath = `/some/path/${fileName}`;

            // intercept request for download and return canned response
            nock(downloadHost)
                .persist()
                .get(filePath)
                .reply(206, function () {
                    const { range } = this.req.headers;
                    const { start, end } = parseRangeHeader(range);
                    return fs.createReadStream(sourceFile, { start, end });
                });

            sinon
                .stub(ipcRenderer, "invoke")
                .withArgs(FileDownloadServiceElectron.GET_DOWNLOADS_DIR)
                .resolves(tempdir);

            const service = new FileDownloadServiceElectron(
                new NotificationServiceElectron(),
                downloadHost as FileDownloadServiceBaseUrl
            );
            const downloadRequestId = "beepbop";
            const onProgress = () => {
                service.cancelActiveRequest(downloadRequestId);
            };
            const expectedDownloadPath = path.join(tempdir, fileName);
            const fileInfo = {
                id: "abc123",
                name: fileName,
                path: filePath,
                size: (await fs.promises.stat(sourceFile)).size,
            };

            // Act
            const result = await service.downloadFile(
                fileInfo,
                undefined,
                downloadRequestId,
                onProgress
            );

            // Assert
            expect(result.resolution).to.equal(DownloadResolution.CANCELLED);

            try {
                await fs.promises.access(expectedDownloadPath);
                throw new assert.AssertionError({
                    message: `${expectedDownloadPath} not cleaned up`,
                });
            } catch (err) {
                // Expect the file to be missing
                const typedErr = err as NodeJS.ErrnoException;
                expect(typedErr.code).to.equal("ENOENT", typedErr.message);
            }
        });

        it("returns meaningful resolution and cleans up after itself if download fails", async () => {
            // Arrange
            const downloadHost = "https://aics-test.corp.alleninstitute.org/labkey/fmsfiles/image";
            const fileName = "image.czi";
            const filePath = `/some/path/${fileName}`;

            // intercept request for download and return canned response
            nock(downloadHost)
                .get(filePath)
                .times(2) // IMPORTANT! Only serve first two requests, fail on the third
                .reply(206, function () {
                    const { range } = this.req.headers;
                    const { start, end } = parseRangeHeader(range);
                    return fs.createReadStream(sourceFile, { start, end });
                });

            sinon
                .stub(ipcRenderer, "invoke")
                .withArgs(FileDownloadServiceElectron.GET_DOWNLOADS_DIR)
                .resolves(tempdir);

            const service = new FileDownloadServiceElectron(
                new NotificationServiceElectron(),
                downloadHost as FileDownloadServiceBaseUrl
            );
            const downloadRequestId = "beepbop";
            const expectedDownloadPath = path.join(tempdir, fileName);
            const fileInfo = {
                id: "abc123",
                name: fileName,
                path: filePath,
                size: (await fs.promises.stat(sourceFile)).size,
            };

            try {
                // Act
                await service.downloadFile(fileInfo, undefined, downloadRequestId);

                // Shouldn't hit, but here to ensure test isn't evergreen
                throw new assert.AssertionError({ message: `Expected exception to be thrown` });
            } catch (err) {
                // Assert
                expect(err).to.be.instanceOf(DownloadFailure);
                expect((err as DownloadFailure).downloadIdentifier).to.equal(downloadRequestId);
            } finally {
                try {
                    await fs.promises.access(expectedDownloadPath);
                    throw new assert.AssertionError({
                        message: `${expectedDownloadPath} not cleaned up`,
                    });
                } catch (err) {
                    // Expect the file to be missing
                    const typedErr = err as NodeJS.ErrnoException;
                    expect(typedErr.code).to.equal("ENOENT", typedErr.message);
                }
            }
        });
    });
});
