import { Zip, ZipDeflate } from "fflate";
import streamSaver from "streamsaver";

import ConcurrentTaskQueue from "../ConcurrentTaskQueue";

type OnProgress = (transferredBytes: number) => void;

/**
 * Entity for streaming a download of files to a large zip
 *
 * Parameter for maxQueueLength is to avoid piling on too many requests to the downloader and overwhelming memory
 * for example, Zarr files can be well into the millions of files. Defaults to 10,000 which is a somewhat arbitrary number that seemed to work well in testing,
 * but can be adjusted based on use case and environment.
 * Parameter for maxParallelStreams is to control how many files are being processed at the same time, which can also help with memory management
 * and can speed up the download by allowing multiple files to be processed at the same time
 * Note that the optimal values for these parameters may depend on the specific use case and environment,
 * and may require some experimentation to find the best settings; 6 is roughly based on max inflight requests
 * for browsers.
 */
export default class StreamedZipDownloader {
    private readonly zip: Zip;
    private readonly maxQueueLength: number;
    private readonly taskQueue: ConcurrentTaskQueue;
    private readonly writer: WritableStreamDefaultWriter<Uint8Array>;
    private isCancelled = false;

    constructor(
        fileName: string,
        onProgress?: OnProgress,
        maxParallelStreams = 6,
        maxQueueLength = 10_000
    ) {
        this.maxQueueLength = maxQueueLength;
        this.taskQueue = new ConcurrentTaskQueue(maxParallelStreams);
        const fileStream = streamSaver.createWriteStream(`${fileName}.zip`);
        this.writer = fileStream.getWriter();
        this.zip = new Zip((err, chunk, final) => {
            if (err) throw err;
            this.writer.write(chunk);
            onProgress?.(chunk.byteLength);
            if (final) this.writer.close();
        });
    }

    public async addFile(path: string, readerGetter: () => Promise<ReadableStream<Uint8Array>>) {
        // Avoid piling on too many requests to the downloader and overwhelming memory
        // for example, Zarr files can be well into the millions of files
        while (this.taskQueue.length >= this.maxQueueLength) {
            if (this.isCancelled) return;
            console.debug("Waiting for the queue to process more files");
            await new Promise((resolve) => setTimeout(resolve, 10_000));
        }

        // Push a task to the queue for the purpose of
        // 1) Register the file to the zip
        // 2) Getting the reader
        // 3) Piping bytes from the reader to the zip writer
        this.taskQueue.push(async () => {
            if (this.isCancelled) return;

            // Register file in zip
            const file = new ZipDeflate(path);
            this.zip.add(file);

            // Retrieve reader
            const reader = await readerGetter();

            // Grab chunks from read stream
            while (true) {
                const { value, done } = await reader.getReader().read();
                if (this.isCancelled) return;
                if (done) break;
                file.push(value); // push chunk to zip
            }

            // Finalize entry
            file.push(new Uint8Array(0), true);
        });
    }

    public async cancel() {
        await this.taskQueue.cancel();
        this.zip.terminate();
        await this.writer.close();
        this.isCancelled = true;
    }

    public async end() {
        await this.taskQueue.drain();
        this.zip.end();
        await this.writer.close();
    }
}
