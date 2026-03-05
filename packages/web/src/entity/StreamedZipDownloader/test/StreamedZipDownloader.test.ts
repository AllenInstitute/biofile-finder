import { expect } from "chai";
import streamSaver from "streamsaver";

import StreamedZipDownloader from "..";

describe("StreamedZipDownloader", () => {
    type WriterStub = {
        writes: Uint8Array[];
        closeCallCount: number;
        write: (chunk: Uint8Array) => Promise<void>;
        close: () => Promise<void>;
    };

    let originalCreateWriteStream: typeof streamSaver.createWriteStream;
    let writer: WriterStub;

    beforeEach(() => {
        originalCreateWriteStream = streamSaver.createWriteStream;
        writer = {
            writes: [],
            closeCallCount: 0,
            write: async (chunk: Uint8Array) => {
                writer.writes.push(chunk);
            },
            close: async () => {
                writer.closeCallCount += 1;
            },
        };

        (streamSaver as {
            createWriteStream: typeof streamSaver.createWriteStream;
        }).createWriteStream = () =>
            ({
                getWriter: () => (writer as unknown) as WritableStreamDefaultWriter<Uint8Array>,
            } as WritableStream<Uint8Array>);
    });

    afterEach(() => {
        (streamSaver as {
            createWriteStream: typeof streamSaver.createWriteStream;
        }).createWriteStream = originalCreateWriteStream;
    });

    describe("addFile", () => {
        it("enqueues a processing task", async () => {
            const downloader = new StreamedZipDownloader("archive");
            let capturedTask: (() => Promise<void>) | undefined;

            ((downloader as unknown) as {
                taskQueue: { length: number; push: (task: () => Promise<void>) => void };
            }).taskQueue = {
                length: 0,
                push: (task) => {
                    capturedTask = task;
                },
            };

            await downloader.addFile("a.txt", async () => {
                throw new Error("readerGetter should not execute until queued task runs");
            });

            expect(capturedTask).to.not.equal(undefined);
        });
    });

    describe("cancel", () => {
        it("cancels queue, terminates zip, closes writer, and marks cancelled", async () => {
            const downloader = new StreamedZipDownloader("archive");
            let queueCancelCallCount = 0;
            let zipTerminateCallCount = 0;

            ((downloader as unknown) as {
                taskQueue: { cancel: () => Promise<void> };
            }).taskQueue = {
                cancel: async () => {
                    queueCancelCallCount += 1;
                },
            };

            ((downloader as unknown) as { zip: { terminate: () => void } }).zip = {
                terminate: () => {
                    zipTerminateCallCount += 1;
                },
            };

            await downloader.cancel();

            expect(queueCancelCallCount).to.equal(1);
            expect(zipTerminateCallCount).to.equal(1);
            expect(writer.closeCallCount).to.equal(1);
            expect(((downloader as unknown) as { isCancelled: boolean }).isCancelled).to.equal(
                true
            );
        });
    });

    describe("end", () => {
        it("end drains queue, ends zip, and closes writer", async () => {
            const downloader = new StreamedZipDownloader("archive");
            let queueDrainCallCount = 0;
            let zipEndCallCount = 0;

            ((downloader as unknown) as { taskQueue: { drain: () => Promise<void> } }).taskQueue = {
                drain: async () => {
                    queueDrainCallCount += 1;
                },
            };

            ((downloader as unknown) as { zip: { end: () => void } }).zip = {
                end: () => {
                    zipEndCallCount += 1;
                },
            };

            await downloader.end();

            expect(queueDrainCallCount).to.equal(1);
            expect(zipEndCallCount).to.equal(1);
            expect(writer.closeCallCount).to.equal(1);
        });
    });
});
