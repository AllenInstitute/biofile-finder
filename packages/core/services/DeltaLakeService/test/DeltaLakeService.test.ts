import { createMockHttpClient } from "@aics/redux-utils";
import { expect } from "chai";
import * as sinon from "sinon";

import DeltaLakeService from "..";
import S3StorageService from "../../S3StorageService";

const TABLE_URL = "https://files.example.com/data/table";
const LOG = `${TABLE_URL}/_delta_log`;

function commit(version: number): string {
    return `${LOG}/${String(version).padStart(20, "0")}.json`;
}

const httpError = (status: number) =>
    Object.assign(new Error(`Request failed with status code ${status}`), {
        isAxiosError: true,
        response: { status },
    });

const add = (path: string) => JSON.stringify({ add: { path } });
const remove = (path: string) => JSON.stringify({ remove: { path } });

describe("DeltaLakeService", () => {
    const mockHttp = createMockHttpClient({
        when: () => true,
        respondWith: {},
    });

    function serveLog(files: Record<string, string>) {
        return sinon.stub(mockHttp, "get").callsFake((url: string) => {
            if (url in files) {
                return Promise.resolve({ data: files[url] }) as any;
            }
            return Promise.reject(httpError(404));
        });
    }

    function serveLogAsS3(files: Record<string, string>): sinon.SinonStub {
        return sinon.stub(mockHttp, "get").callsFake((url: string) => {
            if (url in files) {
                return Promise.resolve({ data: files[url] }) as any;
            }
            return Promise.reject(httpError(403));
        });
    }
    const noopS3 = ({
        formatAsHttpResource: (url: string) => Promise.resolve(url),
    } as unknown) as S3StorageService;
    const service = new DeltaLakeService(mockHttp, sinon.stub().resolves([]), noopS3);

    afterEach(() => sinon.restore());

    describe("isDeltaTable", () => {
        it("is true when the log's first commit exists", async () => {
            serveLog({ [commit(0)]: add("part-0.parquet") });
            expect(await service.isDeltaTable(TABLE_URL)).to.be.true;
        });

        it("is true when only a checkpoint pointer exists", async () => {
            // A long-lived table may have had commit 0 cleaned up.
            serveLog({ [`${LOG}/_last_checkpoint`]: JSON.stringify({ version: 10 }) });
            expect(await service.isDeltaTable(TABLE_URL)).to.be.true;
        });

        it("is false for a URL that is not a Delta table", async () => {
            serveLog({});
            expect(await service.isDeltaTable(TABLE_URL)).to.be.false;
        });

        it("is false rather than throwing when the host is unreachable", async () => {
            sinon.stub(mockHttp, "get").rejects(new Error("network down"));
            expect(await service.isDeltaTable(TABLE_URL)).to.be.false;
        });
    });

    describe("listDataFiles", () => {
        it("replays commits, dropping files a later commit removed", async () => {
            serveLog({
                [commit(0)]: add("part-0.parquet"),
                [commit(1)]: add("part-1.parquet"),
                [commit(2)]: remove("part-0.parquet"),
            });

            expect(await service.listDataFiles(TABLE_URL)).to.deep.equal([
                `${TABLE_URL}/part-1.parquet`,
            ]);
        });

        it("stops at the first missing commit", async () => {
            const get = serveLog({
                [commit(0)]: add("part-0.parquet"),
                [commit(1)]: add("part-1.parquet"),
            });

            const files = await service.listDataFiles(TABLE_URL);

            expect(files).to.have.lengthOf(2);
            expect(get.getCalls().map((c) => c.args[0])).to.include(commit(2));
        });

        it("applies several actions from one commit", async () => {
            serveLog({
                [commit(0)]: [add("a.parquet"), add("b.parquet")].join("\n"),
                [commit(1)]: [remove("a.parquet"), add("c.parquet")].join("\n"),
            });

            const files = await service.listDataFiles(TABLE_URL);
            expect(files.map((f) => f.split("/").pop())).to.deep.equal(["b.parquet", "c.parquet"]);
        });

        it("errors when the log cannot be read from the beginning", async () => {
            // Commit 0 aged out and there is no checkpoint to seed from.
            serveLog({ [commit(4)]: add("part-4.parquet") });

            let caught;
            try {
                await service.listDataFiles(TABLE_URL);
            } catch (err) {
                caught = err;
            }
            expect((caught as Error)?.message).to.include("could not be read from the beginning");
        });

        it("accepts a URL with a trailing slash", async () => {
            serveLog({ [commit(0)]: add("part-0.parquet") });
            expect(await service.listDataFiles(`${TABLE_URL}/`)).to.deep.equal([
                `${TABLE_URL}/part-0.parquet`,
            ]);
        });

        it("throws when every file has been removed", async () => {
            serveLog({
                [commit(0)]: add("part-0.parquet"),
                [commit(1)]: remove("part-0.parquet"),
            });

            let caught;
            try {
                await service.listDataFiles(TABLE_URL);
            } catch (err) {
                caught = err;
            }
            expect((caught as Error)?.message).to.include("No parquet data files");
        });
    });

    describe("hosts that answer 403 for a missing key", () => {
        it("detects a table whose missing log files (403 case)", async () => {
            serveLogAsS3({ [commit(0)]: add("part-0.parquet") });
            expect(await service.isDeltaTable(TABLE_URL)).to.be.true;
        });

        it("ends the commit walk on a 403 instead of failing", async () => {
            serveLogAsS3({
                [commit(0)]: add("part-0.parquet"),
                [commit(1)]: add("part-1.parquet"),
            });

            const files = await service.listDataFiles(TABLE_URL);

            expect(files.map((f) => f.split("/").pop())).to.deep.equal([
                "part-0.parquet",
                "part-1.parquet",
            ]);
        });
    });

    describe("malformed log responses", () => {
        it("names the file when a log response is not JSON", async () => {
            serveLog({ [commit(0)]: "<html><body>Sign in</body></html>" });

            let caught;
            try {
                await service.listDataFiles(TABLE_URL);
            } catch (err) {
                caught = err;
            }
            expect((caught as Error)?.message).to.include(commit(0));
            expect((caught as Error)?.message).to.include("valid Delta Lake transaction log JSON");
        });
    });
});
