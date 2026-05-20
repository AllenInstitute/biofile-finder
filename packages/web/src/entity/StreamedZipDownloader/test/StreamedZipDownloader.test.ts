import { expect } from "chai";
import { noop } from "lodash";
import streamSaver from "streamsaver";

import StreamedZipDownloader from "..";

describe("StreamedZipDownloader", () => {
    type WriterStub = {
        writes: Uint8Array[];
        closeCallCount: number;
        abortCallCount: number;
        write: (chunk: Uint8Array) => Promise<void>;
        close: () => Promise<void>;
        abort: () => Promise<void>;
    };

    let originalCreateWriteStream: typeof streamSaver.createWriteStream;
    let writer: WriterStub;

    beforeEach(() => {
        originalCreateWriteStream = streamSaver.createWriteStream;
        writer = {
            writes: [],
            closeCallCount: 0,
            abortCallCount: 0,
            write: async (chunk: Uint8Array) => {
                writer.writes.push(chunk);
            },
            close: async () => {
                writer.closeCallCount += 1;
            },
            abort: async () => {
                writer.abortCallCount += 1;
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

        // This it to make sure we aren't calculating progress based on the compressed chunk sizes, which can be much different than the original chunk sizes and would give a misleading progress indication to users
        it("reports progress using raw source stream byte lengths", async () => {
            const progressEvents: number[] = [];
            const downloader = new StreamedZipDownloader("archive", (bytes) => {
                progressEvents.push(bytes);
            });
            let resolveTaskCompletion = noop;
            const taskComplete = new Promise<void>((resolve) => {
                resolveTaskCompletion = resolve;
            });

            ((downloader as unknown) as {
                taskQueue: { length: number; push: (task: () => Promise<void>) => void };
            }).taskQueue = {
                length: 0,
                push: (task) => {
                    void task().finally(resolveTaskCompletion);
                },
            };

            const chunks = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5])];
            let readIndex = 0;
            const stream = {
                getReader: () => ({
                    read: async () => {
                        if (readIndex < chunks.length) {
                            const value = chunks[readIndex];
                            readIndex += 1;
                            return { value, done: false };
                        }
                        return { value: undefined, done: true };
                    },
                }),
            };

            await downloader.addFile(
                "a.txt",
                async () => (stream as unknown) as ReadableStream<Uint8Array>
            );
            await taskComplete;

            expect(progressEvents).to.deep.equal([3, 2]);
        });

        // This is a regression test for a bug where multiple calls to getReader would be made on the same stream, which is not allowed
        // and would result in an error. The test ensures that only one reader is created and used for the stream.
        it("reads from a single stream reader instance", async () => {
            const downloader = new StreamedZipDownloader("archive");
            let getReaderCallCount = 0;
            let taskError: unknown;
            let resolveTaskCompletion = noop;
            const taskComplete = new Promise<void>((resolve) => {
                resolveTaskCompletion = resolve;
            });

            ((downloader as unknown) as {
                taskQueue: { length: number; push: (task: () => Promise<void>) => void };
            }).taskQueue = {
                length: 0,
                push: (task) => {
                    void task()
                        .catch((error) => {
                            taskError = error;
                        })
                        .finally(resolveTaskCompletion);
                },
            };

            const reader = {
                read: async () => {
                    if (readerState === 0) {
                        readerState = 1;
                        return { value: new Uint8Array([1]), done: false };
                    }
                    return { value: undefined, done: true };
                },
            };

            let readerState = 0;
            const stream = {
                getReader: () => {
                    getReaderCallCount += 1;
                    if (getReaderCallCount > 1) {
                        throw new TypeError(
                            "ReadableStreamDefaultReader constructor can only accept readable streams that are not yet locked to a reader"
                        );
                    }
                    return reader;
                },
            };

            await downloader.addFile(
                "a.txt",
                async () => (stream as unknown) as ReadableStream<Uint8Array>
            );
            await taskComplete;

            expect(taskError).to.equal(undefined);
            expect(getReaderCallCount).to.equal(1);
        });
    });

    describe("cancel", () => {
        it("cancels queue, terminates zip, aborts writer, and marks cancelled", async () => {
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
            expect(writer.abortCallCount).to.equal(1);
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
