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

    describe("equals", () => {
        it("returns true given filterless and sortless filesets", () => {
            expect(new FileSet().equals(new FileSet())).to.equal(true);
        });

        it("returns true comparing FileSets with the same filters", () => {
            expect(
                new FileSet({ filters: [scientistEqualsJane, matrigelIsHard] }).equals(
                    new FileSet({ filters: [scientistEqualsJane, matrigelIsHard] })
                )
            ).to.equal(true);
        });

        it("returns false comparing FileSets with different filters", () => {
            expect(
                new FileSet({ filters: [scientistEqualsJane, matrigelIsHard] }).equals(
                    new FileSet({ filters: [matrigelIsHard] })
                )
            ).to.equal(false);
        });

        it("returns true comparing FileSets with the same applied sorting", () => {
            expect(
                new FileSet({ sortOrder: [dateCreatedDescending] }).equals(
                    new FileSet({ sortOrder: [dateCreatedDescending] })
                )
            ).to.equal(true);
        });

        it("returns false comparing FileSets with different applied sorting", () => {
            expect(
                new FileSet({ sortOrder: [dateCreatedDescending] }).equals(new FileSet())
            ).to.equal(false);
        });

        it("returns true comparing FileSets with same filters AND applied sorting", () => {
            expect(
                new FileSet({
                    filters: [scientistEqualsJane, matrigelIsHard],
                    sortOrder: [dateCreatedDescending],
                }).equals(
                    new FileSet({
                        filters: [scientistEqualsJane, matrigelIsHard],
                        sortOrder: [dateCreatedDescending],
                    })
                )
            ).to.equal(true);
        });

        it("returns false comparing FileSets with either different filters or applied sorting", () => {
            expect(
                new FileSet({
                    filters: [scientistEqualsJane, matrigelIsHard],
                    sortOrder: [dateCreatedDescending],
                }).equals(
                    new FileSet({
                        filters: [scientistEqualsJane],
                        sortOrder: [dateCreatedDescending],
                    })
                )
            ).to.equal(false);
        });
    });

    describe("fetchFileRange", () => {
        const sandbox = createSandbox();

        afterEach(() => {
            sandbox.reset();
        });

        it("returns slices of the file list represented by the FileSet, specified by index position", async () => {
            const fileIds = ["abc123", "def456", "ghi789", "jkl012", "mno345"];
            const files = fileIds.map((id) => ({ file_id: id }));

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
});
