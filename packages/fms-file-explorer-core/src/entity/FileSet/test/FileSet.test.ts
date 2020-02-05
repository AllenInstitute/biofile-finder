import { createMockHttpClient } from "@aics/redux-utils";
import { expect } from "chai";
import { createSandbox } from "sinon";

import FileFilter from "../../FileFilter";
import FileService from "../../../services/FileService";
import FileSet from "../";
import FileSort, { SortOrder } from "../../FileSort";
import RestServiceResponse from "../../RestServiceResponse";

describe("FileSet", () => {
    const scientistEqualsJane = new FileFilter("scientist", "jane");
    const matrigelIsHard = new FileFilter("matrigel_is_hardened", true);
    const dateCreatedDescending = new FileSort("date_created", SortOrder.DESC);

    describe("toQueryString", () => {
        it("returns an empty string if file set represents a query with no filters and no sorting applied", () => {
            expect(new FileSet().toQueryString()).to.equal("");
        });

        it("includes filters and sort order in query string", () => {
            const fileSet = new FileSet({
                filters: [scientistEqualsJane, matrigelIsHard],
                sortOrder: [dateCreatedDescending],
            });
            expect(fileSet.toQueryString()).equals(
                "scientist=jane&matrigel_is_hardened=true&sort=date_created(DESC)"
            );
        });
    });

    describe("fetchFileRange", () => {
        const sandbox = createSandbox();
        const fileIds = ["abc123", "def456", "ghi789", "jkl012", "mno345"];
        const files = fileIds.map((id) => ({ fileId: id }));

        afterEach(() => {
            sandbox.reset();
        });

        it("returns slices of the file list represented by the FileSet, specified by index position", async () => {
            const fileService = new FileService();
            sandbox.replace(fileService, "getFileIds", () => Promise.resolve(fileIds));
            sandbox.replace(fileService, "getFiles", () =>
                Promise.resolve(
                    new RestServiceResponse({
                        data: files.slice(1, 4),
                        hasMore: false,
                        offset: 0,
                        responseType: "SUCCESS",
                        totalCount: fileIds.length,
                    })
                )
            );
            const fileSet = new FileSet({ fileService });
            expect(await fileSet.fetchFileRange(1, 3)).to.deep.equal(files.slice(1, 4)); // Array.prototype.slice is exclusive of end bound
        });

        it("turns indicies for requested data into a properly formed pagination query", async () => {
            const baseUrl = "test";
            const spec = [
                {
                    expectedUrl: `${baseUrl}/file-explorer-service/1.0/files?from=1&limit=28`,
                    start: 35,
                    end: 55,
                },
                {
                    expectedUrl: `${baseUrl}/file-explorer-service/1.0/files?from=11&limit=23`,
                    start: 256,
                    end: 274,
                },
                {
                    expectedUrl: `${baseUrl}/file-explorer-service/1.0/files?from=0&limit=6`,
                    start: 0,
                    end: 5,
                },
                {
                    expectedUrl: `${baseUrl}/file-explorer-service/1.0/files?from=1&limit=11`,
                    start: 14,
                    end: 21,
                },
                {
                    expectedUrl: `${baseUrl}/file-explorer-service/1.0/files?from=0&limit=5`,
                    start: 2,
                    end: 5,
                },
                {
                    expectedUrl: `${baseUrl}/file-explorer-service/1.0/files?from=3&limit=4`,
                    start: 12,
                    end: 15,
                },
            ];

            await spec.reduce(async (prevTestResult, testCase) => {
                await prevTestResult;

                const httpClient = createMockHttpClient([
                    {
                        when: testCase.expectedUrl,
                        respondWith: {
                            data: {
                                data: files,
                            },
                        },
                    },
                ]);

                const getSpy = sandbox.spy(httpClient, "get");
                const fileSet = new FileSet({
                    fileService: new FileService({ httpClient, baseUrl }),
                });

                await fileSet.fetchFileRange(testCase.start, testCase.end);
                try {
                    expect(getSpy.calledWith(testCase.expectedUrl)).to.equal(true);
                } catch (e) {
                    console.error("Failed on test case: ", testCase);
                    console.error("Actual: ", getSpy.lastCall.args);
                    throw e;
                }
            }, Promise.resolve());
        });
    });

    describe("getFileByIndex", () => {
        const sandbox = createSandbox();

        const fileIds = ["abc123", "def456", "ghi789", "jkl012", "mno345"];
        const files = fileIds.map((id) => ({ fileId: id }));

        const fileService = new FileService();
        const fileSet = new FileSet({ fileService });
        sandbox.replace(fileService, "getFileIds", () => Promise.resolve(fileIds));
        sandbox.replace(fileService, "getFiles", () =>
            Promise.resolve(
                new RestServiceResponse({
                    data: files.slice(),
                    hasMore: false,
                    offset: 0,
                    responseType: "SUCCESS",
                    totalCount: fileIds.length,
                })
            )
        );

        beforeEach(async () => {
            // side-effect of loading file ids for the file set
            await fileSet.fetchFileRange(0, 4);
        });

        afterEach(() => {
            sandbox.reset();
        });

        it("retrieves an FmsFile given its index position within the FileSet", () => {
            expect(fileSet.getFileByIndex(3)).to.equal(files[3]);
        });

        it("returns undefined when asked for an index that hasn't loaded yet", () => {
            expect(fileSet.getFileByIndex(7)).to.equal(undefined);
        });
    });
});
