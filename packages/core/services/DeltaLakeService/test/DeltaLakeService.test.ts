import { expect } from "chai";
import * as sinon from "sinon";
import axios from "axios";

import DeltaLakeService, { MAX_DELTA_DATA_FILES } from "..";
import S3StorageService from "../../S3StorageService";
import { DELTA_RS_LOG, DELTA_RS_LIVE_FILE } from "./fixtures/deltaRsLog";

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
const notFound = httpError(404);

/**
 * Serve a log the way S3 does when the bucket grants s3:GetObject but not
 * s3:ListBucket: a missing key comes back 403 AccessDenied, not 404.
 */
function serveLogAsS3(files: Record<string, string>): sinon.SinonStub {
    return sinon.stub(axios, "get").callsFake((url: string) => {
        if (url in files) {
            return Promise.resolve({ data: files[url] }) as any;
        }
        return Promise.reject(httpError(403));
    });
}

/**
 * Serve a fixed map of log files; anything else 404s, exactly as a static host
 * would. Deliberately no directory listing anywhere.
 */
function serveLog(files: Record<string, string>): sinon.SinonStub {
    return sinon.stub(axios, "get").callsFake((url: string) => {
        if (url in files) {
            return Promise.resolve({ data: files[url] }) as any;
        }
        return Promise.reject(notFound);
    });
}

const add = (path: string) => JSON.stringify({ add: { path } });
const remove = (path: string) => JSON.stringify({ remove: { path } });

/**
 * A stand-in for the URL normalizer. Faithful to the real one in the way that
 * matters here: it hands back the URL unchanged, trailing slash and all, so the
 * service is responsible for joining paths correctly.
 */
function passthroughS3(): S3StorageService {
    return ({
        formatAsHttpResource: (url: string) => Promise.resolve(url),
    } as unknown) as S3StorageService;
}

/** The service under test, with the checkpoint reader and URL normalizer stubbed. */
function makeService(
    readCheckpoint: any = sinon.stub().resolves([]),
    s3StorageService: S3StorageService = passthroughS3()
): DeltaLakeService {
    return new DeltaLakeService(readCheckpoint, s3StorageService);
}

describe("DeltaLakeService", () => {
    afterEach(() => sinon.restore());

    describe("isDeltaTable", () => {
        it("is true when the log's first commit exists", async () => {
            serveLog({ [commit(0)]: add("part-0.parquet") });
            expect(await makeService().isDeltaTable(TABLE_URL)).to.be.true;
        });

        it("is true when only a checkpoint pointer exists", async () => {
            // A long-lived table may have had commit 0 cleaned up.
            serveLog({ [`${LOG}/_last_checkpoint`]: JSON.stringify({ version: 10 }) });
            expect(await makeService().isDeltaTable(TABLE_URL)).to.be.true;
        });

        it("is false for a URL that is not a Delta table", async () => {
            serveLog({});
            expect(await makeService().isDeltaTable(TABLE_URL)).to.be.false;
        });

        it("is false rather than throwing when the host is unreachable", async () => {
            sinon.stub(axios, "get").rejects(new Error("network down"));
            expect(await makeService().isDeltaTable(TABLE_URL)).to.be.false;
        });

        it("never asks for a directory listing", async () => {
            const get = serveLog({ [commit(0)]: add("part-0.parquet") });
            await makeService().isDeltaTable(TABLE_URL);
            get.getCalls().forEach((call) => {
                expect(call.args[0]).to.include("/_delta_log/");
                expect(call.args[0]).to.not.include("list-type");
            });
        });
    });

    describe("listDataFiles", () => {
        it("replays commits, dropping files a later commit removed", async () => {
            serveLog({
                [commit(0)]: add("part-0.parquet"),
                [commit(1)]: add("part-1.parquet"),
                [commit(2)]: remove("part-0.parquet"),
            });

            expect(await makeService().listDataFiles(TABLE_URL)).to.deep.equal([
                `${TABLE_URL}/part-1.parquet`,
            ]);
        });

        it("matches the reference reader on a log delta-rs actually wrote", async () => {
            // The other cases hand-write the log, so they only prove we parse our
            // own idea of the format. This replays a verbatim delta-rs log --
            // commitInfo preambles, populated add/remove actions and all.
            serveLog(
                Object.fromEntries(
                    Object.entries(DELTA_RS_LOG).map(([name, body]) => [`${LOG}/${name}`, body])
                )
            );

            const files = await makeService().listDataFiles(TABLE_URL);

            expect(files.map((f) => f.split("/").pop())).to.deep.equal([DELTA_RS_LIVE_FILE]);
        });

        it("stops at the first missing commit", async () => {
            const get = serveLog({
                [commit(0)]: add("part-0.parquet"),
                [commit(1)]: add("part-1.parquet"),
            });

            const files = await makeService().listDataFiles(TABLE_URL);

            expect(files).to.have.lengthOf(2);
            // 0, 1, then 2 to discover the end -- plus the _last_checkpoint probe.
            expect(get.getCalls().map((c) => c.args[0])).to.include(commit(2));
        });

        it("applies several actions from one commit", async () => {
            serveLog({
                [commit(0)]: [add("a.parquet"), add("b.parquet")].join("\n"),
                [commit(1)]: [remove("a.parquet"), add("c.parquet")].join("\n"),
            });

            const files = await makeService().listDataFiles(TABLE_URL);
            expect(files.map((f) => f.split("/").pop())).to.deep.equal(["b.parquet", "c.parquet"]);
        });

        it("ignores blank lines and non-file actions", async () => {
            serveLog({
                [commit(0)]: [
                    JSON.stringify({ protocol: { minReaderVersion: 1, minWriterVersion: 2 } }),
                    JSON.stringify({ metaData: { id: "abc" } }),
                    "",
                    add("part-0.parquet"),
                    "",
                ].join("\n"),
            });

            expect(await makeService().listDataFiles(TABLE_URL)).to.have.lengthOf(1);
        });

        it("seeds from the checkpoint and replays only later commits", async () => {
            const readCheckpoint = sinon.stub().resolves(["old-a.parquet", "old-b.parquet"]);
            const get = serveLog({
                [`${LOG}/_last_checkpoint`]: JSON.stringify({ version: 10 }),
                [commit(11)]: remove("old-a.parquet"),
                [commit(12)]: add("new.parquet"),
            });

            const files = await makeService(readCheckpoint).listDataFiles(TABLE_URL);

            expect(readCheckpoint.calledOnceWith(`${LOG}/00000000000000000010.checkpoint.parquet`))
                .to.be.true;
            expect(files.map((f) => f.split("/").pop())).to.deep.equal([
                "old-b.parquet",
                "new.parquet",
            ]);
            // Commits the checkpoint already covers are never fetched.
            expect(get.getCalls().map((c) => c.args[0])).to.not.include(commit(0));
        });

        it("errors when the log cannot be read from the beginning", async () => {
            // Commit 0 aged out and there is no checkpoint to seed from.
            serveLog({ [commit(4)]: add("part-4.parquet") });

            let caught;
            try {
                await makeService().listDataFiles(TABLE_URL);
            } catch (err) {
                caught = err;
            }
            expect((caught as Error)?.message).to.include("could not be read from the beginning");
        });

        it("converts an s3 URL to https so CORS works", async () => {
            // duckdb-wasm and the browser cannot fetch an s3: URL directly.
            const get = serveLog({
                "https://s3.amazonaws.com/bucket/data/table/_delta_log/00000000000000000000.json": add(
                    "part-0.parquet"
                ),
            });

            const files = await makeService(
                sinon.stub().resolves([]),
                new S3StorageService()
            ).listDataFiles("s3://bucket/data/table");

            expect(files).to.deep.equal([
                "https://s3.amazonaws.com/bucket/data/table/part-0.parquet",
            ]);
            get.getCalls().forEach((call) => expect(call.args[0]).to.not.include("s3://"));
        });

        it("never routes an http URL through S3 parsing", async () => {
            // S3StorageService.parseUrl probes with ?list-type=2 and gives up when
            // the host cannot list -- which is every plain web server, and exactly
            // the case this reader exists to support.
            const s3 = new S3StorageService();
            const format = sinon.spy(s3, "formatAsHttpResource");
            serveLog({ [commit(0)]: add("part-0.parquet") });

            const files = await makeService(sinon.stub().resolves([]), s3).listDataFiles(TABLE_URL);

            expect(files).to.deep.equal([`${TABLE_URL}/part-0.parquet`]);
            expect(format.called, "http URL should not be handed to S3StorageService").to.be.false;
        });

        it("accepts a URL with a trailing slash", async () => {
            serveLog({ [commit(0)]: add("part-0.parquet") });
            expect(await makeService().listDataFiles(`${TABLE_URL}/`)).to.deep.equal([
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
                await makeService().listDataFiles(TABLE_URL);
            } catch (err) {
                caught = err;
            }
            expect((caught as Error)?.message).to.include("No parquet data files");
        });

        it("throws rather than registering an unbounded number of files", async () => {
            const adds = Array.from({ length: MAX_DELTA_DATA_FILES + 5 }, (_, i) =>
                add(`part-${i}.parquet`)
            );
            serveLog({ [commit(0)]: adds.join("\n") });

            let caught;
            try {
                await makeService().listDataFiles(TABLE_URL);
            } catch (err) {
                caught = err;
            }
            expect((caught as Error)?.message).to.include(`${MAX_DELTA_DATA_FILES}`);
        });
    });

    describe("hosts that answer 403 for a missing key", () => {
        // Verified against a real public S3 bucket: without s3:ListBucket, a GET
        // for a key that does not exist returns 403 AccessDenied, not 404.
        it("detects a table whose missing log files 403", async () => {
            serveLogAsS3({ [commit(0)]: add("part-0.parquet") });
            expect(await makeService().isDeltaTable(TABLE_URL)).to.be.true;
        });

        it("ends the commit walk on a 403 instead of failing", async () => {
            serveLogAsS3({
                [commit(0)]: add("part-0.parquet"),
                [commit(1)]: add("part-1.parquet"),
            });

            const files = await makeService().listDataFiles(TABLE_URL);

            expect(files.map((f) => f.split("/").pop())).to.deep.equal([
                "part-0.parquet",
                "part-1.parquet",
            ]);
        });
    });

    describe("malformed log responses", () => {
        it("names the file when a log response is not JSON", async () => {
            // A proxy or login page served with a 200 would otherwise surface as
            // a bare "Unexpected token <".
            serveLog({ [commit(0)]: "<html><body>Sign in</body></html>" });

            let caught;
            try {
                await makeService().listDataFiles(TABLE_URL);
            } catch (err) {
                caught = err;
            }
            expect((caught as Error)?.message).to.include(commit(0));
            expect((caught as Error)?.message).to.include("valid Delta Lake transaction log JSON");
        });
    });
});
