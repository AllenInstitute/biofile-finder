import * as fs from "fs";
import * as os from "os";

import { expect } from "chai";
import { ipcRenderer } from "electron";
import nock from "nock";
import { createSandbox } from "sinon";

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
        const sandbox = createSandbox();
        const tempfile = `${os.tmpdir()}/manifest.csv`;

        beforeEach(async () => {
            // ensure tempfile exists
            const fd = await fs.promises.open(tempfile, "w+");
            await fd.close();
        });

        afterEach(async () => {
            await fs.promises.unlink(tempfile);
            sandbox.restore();
        });

        it("saves CSV to a file", async () => {
            // Arrange
            const DOWNLOAD_HOST = "http://aics-test.corp.alleninstitute.org";
            const DOWNLOAD_PATH = "/file-explorer-service/1.0/files/selection/manifest";
            const CSV_BODY =
                "Hello, it's me, I was wondering if after all these years you'd like to meet";

            // intercept request for download and return canned response
            nock(DOWNLOAD_HOST)
                .post(DOWNLOAD_PATH)
                .reply(200, CSV_BODY, {
                    "Content-Type": "text/csv;charset=UTF-8",
                    "Content-Disposition": "attachment;filename=manifest.csv",
                });

            sandbox
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
    });
});
