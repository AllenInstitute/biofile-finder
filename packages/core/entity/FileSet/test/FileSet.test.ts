import { createMockHttpClient } from "@aics/redux-utils";
import { expect } from "chai";
import { createSandbox } from "sinon";

import FileSet from "../";
import FileFilter from "../../FileFilter";
import FileSort, { SortOrder } from "../../FileSort";
import { makeFileDetailMock } from "../../FileDetail/mocks";
import HttpFileService from "../../../services/FileService/HttpFileService";
import FileDownloadServiceNoop from "../../../services/FileDownloadService/FileDownloadServiceNoop";

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
                sort: dateCreatedDescending,
            });
            expect(fileSet.toQueryString()).equals(
                "matrigel_is_hardened=true&scientist=jane&sort=date_created(DESC)"
            );
        });

        it("produces the same query string when given the same filters in different order", () => {
            const fileSet1 = new FileSet({
                filters: [scientistEqualsJane, matrigelIsHard],
            });
            const fileSet2 = new FileSet({
                filters: [matrigelIsHard, scientistEqualsJane],
            });

            expect(fileSet1.toQueryString()).to.equal(fileSet2.toQueryString());
        });
    });

    describe("fetchFileRange", () => {
        const sandbox = createSandbox();
        const fileIds = ["abc123", "def456", "ghi789", "jkl012", "mno345"];
        const files = fileIds.map((id) => makeFileDetailMock(id));

        afterEach(() => {
            sandbox.reset();
        });

        it("returns slices of the file list represented by the FileSet, specified by index position", async () => {
            const fileService = new HttpFileService();
            sandbox.replace(fileService, "getFiles", () => Promise.resolve(files.slice(1, 4)));
            const fileSet = new FileSet({ fileService });
            expect(await fileSet.fetchFileRange(1, 3)).to.deep.equal(files.slice(1, 4)); // Array.prototype.slice is exclusive of end bound
        });

        it("turns indicies for requested data into a properly formed pagination query", async () => {
            const baseUrl = "test";
            const spec = [
                {
                    expectedUrl: `${baseUrl}/${HttpFileService.BASE_FILES_URL}?from=1&limit=28`,
                    start: 35,
                    end: 55,
                },
                {
                    expectedUrl: `${baseUrl}/${HttpFileService.BASE_FILES_URL}?from=11&limit=23`,
                    start: 256,
                    end: 274,
                },
                {
                    expectedUrl: `${baseUrl}/${HttpFileService.BASE_FILES_URL}?from=0&limit=6`,
                    start: 0,
                    end: 5,
                },
                {
                    expectedUrl: `${baseUrl}/${HttpFileService.BASE_FILES_URL}?from=1&limit=11`,
                    start: 14,
                    end: 21,
                },
                {
                    expectedUrl: `${baseUrl}/${HttpFileService.BASE_FILES_URL}?from=0&limit=6`,
                    start: 2,
                    end: 5,
                },
                {
                    expectedUrl: `${baseUrl}/${HttpFileService.BASE_FILES_URL}?from=3&limit=4`,
                    start: 12,
                    end: 15,
                },
                {
                    expectedUrl: `${baseUrl}/${HttpFileService.BASE_FILES_URL}?from=0&limit=301`,
                    start: 2,
                    end: 300,
                },
            ];

            for (const testCase of spec) {
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
                    fileService: new HttpFileService({
                        httpClient,
                        baseUrl,
                        downloadService: new FileDownloadServiceNoop(),
                    }),
                });

                await fileSet.fetchFileRange(testCase.start, testCase.end);
                try {
                    expect(getSpy.calledWith(testCase.expectedUrl)).to.equal(true);
                } catch (e) {
                    console.error("Failed on test case: ", testCase);
                    console.error("Actual: ", getSpy.lastCall.args);
                    throw e;
                }
            }
        });
    });

    describe("getFileByIndex", () => {
        const sandbox = createSandbox();

        const fileIds: string[] = ["abc123", "def456", "ghi789", "jkl012", "mno345"];
        const files = fileIds.map((id) => makeFileDetailMock(id));

        const fileService = new HttpFileService();
        const fileSet = new FileSet({ fileService });
        sandbox.replace(fileService, "getFiles", () => Promise.resolve(files.slice()));

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
