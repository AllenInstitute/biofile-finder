import * as http from "http";
import * as fs from "fs";
import * as net from "net";
import * as os from "os";

import { expect } from "chai";
import { session } from "electron";

import { RUN_IN_MAIN } from "../../util/constants";
import ElectronDownloader from "../ElectronDownloader";

describe(`${RUN_IN_MAIN} ElectronDownloader`, () => {
    const tempfile = `${os.tmpdir()}/file.txt`;
    const expectedFileContent = "Some text.";
    let server: http.Server;

    const getServerAddress = (): net.AddressInfo => {
        const address = server.address();
        if (!address || typeof address === "string") {
            throw new Error("Problem with starting mock http server");
        }

        return address;
    };

    before(async () => {
        // Prepare stub file to server on request
        await fs.promises.writeFile(tempfile, expectedFileContent, { encoding: "utf-8" });

        // Setup test HTTP server to server download requests
        const requestListener: http.RequestListener = function (_req, res) {
            res.writeHead(200);
            fs.createReadStream(tempfile).pipe(res);
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

    describe("download", () => {
        const downloadPath = `${os.tmpdir()}/file-to-download.txt`;
        afterEach(async () => {
            try {
                await fs.promises.unlink(tempfile);
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
                    /** */
                },
                uid: "foo",
            };
            const { port } = getServerAddress();
            const url = `http://localhost:${port}`;

            // Act
            await downloader.download(session.defaultSession, url, config);

            // Assert
            const actualContent = await fs.promises.readFile(downloadPath, { encoding: "utf-8" });
            expect(actualContent).to.equal(expectedFileContent);
        });
    });
});
