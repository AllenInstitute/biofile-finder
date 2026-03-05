import { expect } from "chai";
import sinon from "sinon";
import streamSaver from "streamsaver";

import { DownloadResolution, FileInfo } from "../../../../core/services";
import StreamedZipDownloader from "../../entity/StreamedZipDownloader";
import FileDownloadServiceWeb from "../FileDownloadServiceWeb";

describe("FileDownloadServiceWeb", () => {
    afterEach(() => {
        sinon.restore();
    });

    describe("isLocalPath", () => {
        it("returns true for file uri and plain local path", () => {
            expect(FileDownloadServiceWeb.isLocalPath("file:///tmp/example.zarr")).to.equal(true);
            expect(FileDownloadServiceWeb.isLocalPath("/tmp/example.zarr")).to.equal(true);
        });

        it("returns false for http, https, ftp, and windows drive paths", () => {
            expect(FileDownloadServiceWeb.isLocalPath("http://example.org/test")).to.equal(false);
            expect(FileDownloadServiceWeb.isLocalPath("https://example.org/test")).to.equal(false);
            expect(FileDownloadServiceWeb.isLocalPath("ftp://example.org/test")).to.equal(false);
            expect(FileDownloadServiceWeb.isLocalPath("C:\\data\\test.zarr")).to.equal(false);
        });
    });

    describe("download", () => {
        it("uses the file download path for non-directory files", async () => {
            const service = new FileDownloadServiceWeb();
            const expected = {
                downloadRequestId: "id-1",
                resolution: DownloadResolution.SUCCESS,
            };

            const downloadFileStub = sinon
                .stub(
                    (service as unknown) as { downloadFile: (fileInfo: FileInfo) => Promise<any> },
                    "downloadFile"
                )
                .resolves(expected);
            const downloadDirectoryStub = sinon.stub(
                (service as unknown) as {
                    downloadDirectory: (
                        fileInfo: FileInfo,
                        downloadRequestId: string,
                        onProgress?: (transferredBytes: number) => void,
                        destination?: string
                    ) => Promise<any>;
                },
                "downloadDirectory"
            );

            const fileInfo: FileInfo = {
                id: "id-1",
                name: "single-file.txt",
                path: "https://example.org/single-file.txt",
            };

            const result = await service.download(fileInfo, "request-1");

            expect(downloadFileStub.calledOnceWithExactly(fileInfo)).to.equal(true);
            expect(downloadDirectoryStub.called).to.equal(false);
            expect(result).to.deep.equal(expected);
        });

        it("throws a helpful error for local directory downloads", async () => {
            const service = new FileDownloadServiceWeb();
            const fileInfo: FileInfo = {
                id: "dir-1",
                name: "example.zarr",
                path: "/Users/me/example.zarr",
            };

            try {
                await service.download(fileInfo, "request-2");
                throw new Error("Expected local zarr download to throw");
            } catch (error) {
                expect((error as Error).message).to.contain("Due to security restrictions");
                expect((error as Error).message).to.contain(fileInfo.path);
            }
        });

        it("creates and clicks a link for string data downloads", async () => {
            const service = new FileDownloadServiceWeb();
            const fileInfo: FileInfo = {
                id: "id-2",
                name: "result.txt",
                path: "s3://bucket/path/result.txt",
                data: "s3://bucket/path/result.txt",
            };

            const formattedUrl = "https://example.org/result.txt";
            sinon
                .stub(
                    (service as unknown) as {
                        s3StorageService: {
                            formatAsHttpResource: (url: string) => Promise<string | undefined>;
                        };
                    },
                    "s3StorageService"
                )
                .value({
                    formatAsHttpResource: async () => formattedUrl,
                });

            const anchor = {
                href: "",
                download: "",
                target: "",
                click: sinon.spy(),
                remove: sinon.spy(),
            };
            const createElementStub = sinon.stub(document as any, "createElement").callsFake(((
                tagName: string
            ) => {
                if (tagName === "a") {
                    return anchor;
                }
                throw new Error(`Unexpected tag requested: ${tagName}`);
            }) as any);
            const revokeStub = sinon.stub(URL, "revokeObjectURL");

            const result = await service.download(fileInfo, "request-3");

            expect(result.resolution).to.equal(DownloadResolution.SUCCESS);
            expect(result.downloadRequestId).to.equal(fileInfo.id);
            expect(createElementStub.calledOnceWithExactly("a")).to.equal(true);
            expect((anchor.click as sinon.SinonSpy).calledOnce).to.equal(true);
            expect((anchor.remove as sinon.SinonSpy).calledOnce).to.equal(true);
            expect(anchor.href).to.equal(formattedUrl);
            expect(anchor.download).to.equal(fileInfo.name);
            expect(anchor.target).to.equal("_blank");
            expect(revokeStub.calledOnceWithExactly(formattedUrl)).to.equal(true);
        });

        it("downloads cloud directory and returns success", async () => {
            const service = new FileDownloadServiceWeb();
            const fileInfo: FileInfo = {
                id: "dir-cloud-1",
                name: "dataset.zarr",
                path: "https://example.org/dataset.zarr",
            };

            const writer = {
                write: () => Promise.resolve(),
                close: () => Promise.resolve(),
            };
            const originalCreateWriteStream = streamSaver.createWriteStream;
            (streamSaver as {
                createWriteStream: typeof streamSaver.createWriteStream;
            }).createWriteStream = () =>
                ({
                    getWriter: () => (writer as unknown) as WritableStreamDefaultWriter<Uint8Array>,
                } as WritableStream<Uint8Array>);

            const addFileStub = sinon.stub(StreamedZipDownloader.prototype, "addFile").resolves();
            const endStub = sinon.stub(StreamedZipDownloader.prototype, "end").resolves();
            const cancelStub = sinon.stub(StreamedZipDownloader.prototype, "cancel").resolves();

            const pathsGenerator = (async function* () {
                yield "0/zarr.json";
                yield "0/c/0/0";
            })();

            sinon
                .stub(
                    (service as unknown) as {
                        getRelativePathsInDirectory: (path: string) => AsyncGenerator<string>;
                    },
                    "getRelativePathsInDirectory"
                )
                .returns(pathsGenerator);

            const result = await service.download(fileInfo, "request-cloud-1");

            (streamSaver as {
                createWriteStream: typeof streamSaver.createWriteStream;
            }).createWriteStream = originalCreateWriteStream;

            expect(addFileStub.callCount).to.equal(2);
            expect(endStub.calledOnce).to.equal(true);
            expect(cancelStub.called).to.equal(false);
            expect(result.resolution).to.equal(DownloadResolution.SUCCESS);
            expect(result.downloadRequestId).to.equal(fileInfo.id);
            expect(
                ((service as unknown) as { activeRequestMap: Record<string, unknown> })
                    .activeRequestMap["request-cloud-1"]
            ).to.equal(undefined);
        });

        it("throws for unsupported data type", async () => {
            const service = new FileDownloadServiceWeb();
            const fileInfo: FileInfo = {
                id: "id-3",
                name: "bad-data",
                path: "https://example.org/bad-data",
                data: (123 as unknown) as FileInfo["data"],
            };

            try {
                await service.download(fileInfo, "request-4");
                throw new Error("Expected unsupported data type to throw");
            } catch (error) {
                expect((error as Error).message).to.equal("Unsupported data type for download");
            }
        });
    });

    describe("getDefaultDownloadDirectory", () => {
        it("throws because web implementation is not supported", async () => {
            const service = new FileDownloadServiceWeb();

            try {
                await service.getDefaultDownloadDirectory();
                throw new Error("Expected getDefaultDownloadDirectory to throw");
            } catch (error) {
                expect((error as Error).message).to.equal(
                    "FileDownloadServiceWeb:getDefaultDownloadDirectory not implemented for web"
                );
            }
        });
    });
});
