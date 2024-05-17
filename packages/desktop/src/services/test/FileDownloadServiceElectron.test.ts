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
import { RUN_IN_RENDERER } from "../../util/constants";
import FileDownloadServiceElectron from "../FileDownloadServiceElectron";
import { noop } from "lodash";

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

    describe("getDefaultDownloadDirectory", () => {
        afterEach(() => {
            sinon.restore();
        });

        it("returns default directory", async () => {
            // Arrange
            const expectedDirectory = "somewhere/that/is/a/dir";
            sinon
                .stub(ipcRenderer, "invoke")
                .withArgs(FileDownloadServiceElectron.GET_DOWNLOADS_DIR)
                .resolves(expectedDirectory);

            const service = new FileDownloadServiceElectron();

            // Act
            const actualDirectory = await service.getDefaultDownloadDirectory();

            // Assert
            expect(actualDirectory).to.equal(expectedDirectory);
        });
    });

    describe("download", () => {
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

            const service = new FileDownloadServiceElectron();
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
            const result = await service.download(fileInfo, downloadRequestId, noop, tempdir);

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

            const service = new FileDownloadServiceElectron();
            const downloadRequestId = "beepbop";
            const onProgressSpy = sinon.spy();
            const fileInfo = {
                id: "abc123",
                name: fileName,
                path: filePath,
                size: (await fs.promises.stat(sourceFile)).size,
            };

            // Act
            const result = await service.download(
                fileInfo,
                downloadRequestId,
                onProgressSpy,
                tempdir
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

            const service = new FileDownloadServiceElectron();
            const downloadRequestId = "beepbop";
            const expectedDownloadPath = path.join(tempdir, fileName);
            const fileInfo = {
                id: "abc123",
                name: fileName,
                path: filePath,
                size: (await fs.promises.stat(sourceFile)).size,
            };

            // Act
            const result = await service.download(fileInfo, downloadRequestId, noop, tempdir);

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

            const service = new FileDownloadServiceElectron();
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
                await service.download(fileInfo, downloadRequestId, noop, tempdir);

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
