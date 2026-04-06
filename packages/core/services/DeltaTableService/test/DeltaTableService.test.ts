import { expect } from "chai";
import "mocha";

import DeltaTableService from "..";

describe("DeltaTableService", () => {
    it("replays add/remove actions across log versions", async () => {
        const rootUri = "https://example-bucket.s3.us-west-2.amazonaws.com/delta-table-example";
        const logFiles = [
            `${rootUri}/_delta_log/00000000000000000001.json`,
            `${rootUri}/_delta_log/00000000000000000000.json`,
        ];

        const logContents: Record<string, string> = {
            [`${rootUri}/_delta_log/00000000000000000000.json`]: [
                JSON.stringify({ add: { path: "part-0000.parquet" } }),
                JSON.stringify({ add: { path: "part-0001.parquet" } }),
            ].join("\n"),
            [`${rootUri}/_delta_log/00000000000000000001.json`]: [
                JSON.stringify({ remove: { path: "part-0000.parquet" } }),
                JSON.stringify({ add: { path: "part-0002.parquet" } }),
            ].join("\n"),
        };

        const service = new DeltaTableService({
            listDeltaLogJsonFiles: async () => logFiles,
            fetchText: async (url) => logContents[url],
        });

        const files = await service.resolveActiveParquetFiles(rootUri);

        expect(files).to.deep.equal([
            `${rootUri}/part-0001.parquet`,
            `${rootUri}/part-0002.parquet`,
        ]);
    });

    it("supports absolute paths in add/remove actions", async () => {
        const rootUri = "https://example-bucket.s3.us-west-2.amazonaws.com/delta-table-example";
        const absolutePath =
            "https://example-bucket.s3.us-west-2.amazonaws.com/delta-table-example/part-abs.parquet";

        const service = new DeltaTableService({
            listDeltaLogJsonFiles: async () => [`${rootUri}/_delta_log/00000000000000000000.json`],
            fetchText: async () =>
                [
                    JSON.stringify({ add: { path: absolutePath } }),
                    JSON.stringify({ remove: { path: absolutePath } }),
                ].join("\n"),
        });

        const files = await service.resolveActiveParquetFiles(rootUri);

        expect(files).to.deep.equal([]);
    });

    it("throws when log listing is empty", async () => {
        const service = new DeltaTableService({
            listDeltaLogJsonFiles: async () => [],
            fetchText: async () => "",
        });

        let error: Error | undefined;
        try {
            await service.resolveActiveParquetFiles("https://example.com/delta-root");
        } catch (err) {
            error = err as Error;
        }

        expect(error).to.not.equal(undefined);
        expect(error?.message).to.contain("No delta log JSON files found");
    });

    it("throws on malformed JSON lines", async () => {
        const rootUri = "https://example.com/delta-root";
        const service = new DeltaTableService({
            listDeltaLogJsonFiles: async () => [`${rootUri}/_delta_log/00000000000000000000.json`],
            fetchText: async () => "this is not json",
        });

        let error: Error | undefined;
        try {
            await service.resolveActiveParquetFiles(rootUri);
        } catch (err) {
            error = err as Error;
        }

        expect(error).to.not.equal(undefined);
        expect(error?.message).to.contain("Invalid delta log JSON line");
    });

    it("discovers logs with getObject-only access using checkpoint and version probing", async () => {
        const rootUri = "https://example-bucket.s3.us-west-2.amazonaws.com/delta-table-example";
        const deltaLog = `${rootUri}/_delta_log`;
        const log0 = `${deltaLog}/00000000000000000000.json`;
        const log1 = `${deltaLog}/00000000000000000001.json`;
        const log2 = `${deltaLog}/00000000000000000002.json`;
        const checkpoint = `${deltaLog}/_last_checkpoint`;

        const service = new DeltaTableService({
            fetchText: async (url) => {
                if (url === checkpoint) {
                    return JSON.stringify({ version: 1 });
                }
                if (url === log0) {
                    return JSON.stringify({ add: { path: "part-0000.parquet" } });
                }
                if (url === log1) {
                    return JSON.stringify({ add: { path: "part-0001.parquet" } });
                }
                if (url === log2) {
                    return JSON.stringify({ remove: { path: "part-0000.parquet" } });
                }

                throw { response: { status: 404 } };
            },
        });

        const files = await service.resolveActiveParquetFiles(rootUri);
        expect(files).to.deep.equal([`${rootUri}/part-0001.parquet`]);
    });

    it("accepts _delta_log URI directly and resolves against table root", async () => {
        const tableRoot = "https://example-bucket.s3.us-west-2.amazonaws.com/delta-table-example";
        const deltaLogRoot = `${tableRoot}/_delta_log`;
        const log0 = `${deltaLogRoot}/00000000000000000000.json`;

        const service = new DeltaTableService({
            fetchText: async (url) => {
                if (url === log0) {
                    return JSON.stringify({ add: { path: "part-0000.parquet" } });
                }
                throw { response: { status: 404 } };
            },
        });

        const files = await service.resolveActiveParquetFiles(deltaLogRoot);
        expect(files).to.deep.equal([`${tableRoot}/part-0000.parquet`]);
    });
});
