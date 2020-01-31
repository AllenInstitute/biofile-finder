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

        afterEach(() => {
            sandbox.reset();
        });

        it("returns slices of the file list represented by the FileSet, specified by index position", async () => {
            const fileIds = ["abc123", "def456", "ghi789", "jkl012", "mno345"];
            const files = fileIds.map((id) => ({ fileId: id }));

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
