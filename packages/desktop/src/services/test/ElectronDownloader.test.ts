import * as assert from "assert";
import * as http from "http";
import * as fs from "fs";
import * as net from "net";
import * as os from "os";

import { expect } from "chai";
import { session } from "electron";
import { createSandbox } from "sinon";

import { DownloadFailure } from "../../../../core/errors";
import { RUN_IN_MAIN } from "../../util/constants";
import ElectronDownloader, { ElectronDownloadResolution } from "../ElectronDownloader";

describe(`${RUN_IN_MAIN} ElectronDownloader`, () => {
    const tempfile = `${os.tmpdir()}/file.txt`;
    const expectedFileContent = "Some text.";
    let server: http.Server;

    const getServerAddress = (): net.AddressInfo => {
        const address = server.address();
        if (!address || typeof address === "string") {
            throw new Error(
                `Expected server.address() to return a net.AddressInfo object, got: ${address}`
            );
        }

        return address;
    };

    before(async () => {
        // Prepare stub file to server on request
        await fs.promises.writeFile(tempfile, expectedFileContent, { encoding: "utf-8" });

        // Setup test HTTP server to serve download requests
        const endpoints: { [index: string]: (res: http.ServerResponse) => void } = {
            "/succeed": (res) => {
                res.writeHead(200);
                fs.createReadStream(tempfile).pipe(res);
            },
            "/fail": (res) => {
                res.writeHead(500);
                res.end();
            },
        };
        const requestListener: http.RequestListener = function (req, res) {
            const url = req.url || "";
            const endpoint = endpoints[url];
            if (!endpoint) {
                res.writeHead(404);
                res.end(`Test server not configured to handle requests to ${url}`);
                return;
            }
            endpoint(res);
        };

        server = http.createServer(requestListener);
        await new Promise((resolve) => {
            server.listen(resolve); // bind to a random, unused port
        });
    });

    after(async () => {
        // Remove stub file
        await fs.promises.unlink(tempfile);

        // Tear down test HTTP server
        await new Promise<void>((resolve, reject) => {
            server.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    });

    const sandbox = createSandbox();
    const downloadPath = `${os.tmpdir()}/file-to-download.txt`;
    afterEach(async () => {
        sandbox.reset();
        try {
            await fs.promises.unlink(downloadPath);
        } catch (err) {
            // If the file doesn't exist, ignore. Else, re-raise.
            if (err.code !== "ENOENT") {
                throw err;
            }
        }
    });

    it("downloads a file", async () => {
        // Arrange
        const downloader = new ElectronDownloader();
        const config = {
            filePath: downloadPath,
            onProgress: () => {
                /** noop */
            },
            uid: "foo",
        };
        const { port } = getServerAddress();
        const url = `http://localhost:${port}/succeed`;

        // Act
        const result = await downloader.download(session.defaultSession, url, config);

        // Assert
        expect(result).to.equal(ElectronDownloadResolution.COMPLETED);
        const actualContent = await fs.promises.readFile(downloadPath, { encoding: "utf-8" });
        expect(actualContent).to.equal(expectedFileContent);
    });

    it("calls onProgress handler", async () => {
        // Arrange
        const downloader = new ElectronDownloader();
        const onProgressSpy = sandbox.spy();
        const config = {
            filePath: downloadPath,
            onProgress: onProgressSpy,
            uid: "foo",
        };
        const { port } = getServerAddress();
        const url = `http://localhost:${port}/succeed`;

        // Act
        await downloader.download(session.defaultSession, url, config);

        // Assert
        expect(onProgressSpy.called).to.equal(true);
        expect(onProgressSpy.calledWith(0)).to.equal(true);

        const { size } = await fs.promises.stat(tempfile);
        expect(onProgressSpy.calledWith(size)).to.equal(true);
    });

    it("cancels a download and cleans up after itself", async () => {
        // Arrange
        const downloader = new ElectronDownloader();
        const uid = "foo";
        const config = {
            filePath: downloadPath,
            onProgress: () => {
                downloader.cancelDownload(uid);
            },
            uid,
        };
        const { port } = getServerAddress();
        const url = `http://localhost:${port}/succeed`;

        // Act
        const result = await downloader.download(session.defaultSession, url, config);

        // Assert
        expect(result).to.equal(ElectronDownloadResolution.CANCELLED);

        try {
            await fs.promises.access(downloadPath);
            throw new assert.AssertionError({ message: `${downloadPath} not cleaned up` });
        } catch (err) {
            // Expect the file to be missing
            expect(err.code).to.equal("ENOENT", err.message);
        }
    });

    it("returns meaningful resolution and cleans up after itself if download fails", async () => {
        // Arrange
        const downloader = new ElectronDownloader();
        const config = {
            filePath: downloadPath,
            onProgress: () => {
                /** noop */
            },
            uid: "foo",
        };
        const { port } = getServerAddress();

        const url = `http://localhost:${port}/fail`;

        try {
            // Act
            await downloader.download(session.defaultSession, url, config);

            // Shouldn't hit, but here to ensure test isn't evergreen
            throw new assert.AssertionError({ message: `Expected exception to be thrown` });
        } catch (err) {
            // Assert
            expect(err).to.be.instanceOf(DownloadFailure);
            expect(err.message).to.equal(ElectronDownloadResolution.INTERRUPTED);
            expect((err as DownloadFailure).downloadIdentifier).to.equal("foo");
        } finally {
            try {
                await fs.promises.access(downloadPath);
                throw new assert.AssertionError({ message: `${downloadPath} not cleaned up` });
            } catch (err) {
                // Expect the file to be missing
                expect(err.code).to.equal("ENOENT", err.message);
            }
        }
    });
});
