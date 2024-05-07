import { createMockHttpClient } from "@aics/redux-utils";
import { expect } from "chai";
import { identity } from "lodash";

import FileSet from "../../FileSet";
import NumericRange from "../../NumericRange";

import FileSelection, { FocusDirective } from "..";
import FileFilter from "../../FileFilter";
import { IndexError, ValueError } from "../../../errors";
import HttpFileService from "../../../services/FileService/HttpFileService";
import FileDetail from "../../FileDetail";

describe("FileSelection", () => {
    describe("select", () => {
        it("selects file -- single", () => {
            // Arrange
            const selection = new FileSelection();

            // Act
            const nextSelection = selection.select({
                fileSet: new FileSet(),
                index: 3,
                sortOrder: 0,
            });

            // Assert
            expect(nextSelection.isSelected(new FileSet(), 3)).equals(true);
        });

        it("selects a file -- multiple", () => {
            // Arrange
            const selection = new FileSelection();

            // Act
            const nextSelection = selection.select({
                fileSet: new FileSet(),
                index: new NumericRange(3, 7),
                sortOrder: 0,
            });

            // Assert
            [3, 4, 5, 6, 7].forEach((idx) => {
                expect(nextSelection.isSelected(new FileSet(), idx)).equals(true);
            });
        });

        it("handles a case in which a new selection overlaps with a previous one", () => {
            // Arrange
            const fileSet1 = new FileSet();
            const fileSet2 = new FileSet({
                filters: [new FileFilter("Workflow", "Pipeline 10000")],
            });
            const previouslySelectedRange = new NumericRange(30, 60);
            const newlySelectedRange = new NumericRange(4, 100);
            const selection = new FileSelection()
                .select({ fileSet: fileSet1, index: previouslySelectedRange, sortOrder: 0 })
                .select({ fileSet: fileSet2, index: 88, sortOrder: 1 });

            // Act
            const nextSelection = selection.select({
                fileSet: fileSet1,
                index: newlySelectedRange,
                sortOrder: 0,
            });

            // Assert
            expect(nextSelection.isSelected(fileSet2, 88)).to.equal(true);
            expect(
                nextSelection.isSelected(
                    fileSet1,
                    previouslySelectedRange.union(newlySelectedRange)
                )
            ).to.equal(true);
        });

        it("makes the new selection focused", () => {
            // Arrange
            const selection = new FileSelection();
            const fileSet = new FileSet();
            const selectedRange = new NumericRange(10, 20);

            // Act
            const nextSelection = selection.select({ fileSet, index: selectedRange, sortOrder: 0 });

            // Assert
            expect(nextSelection.isFocused(fileSet, 20)).to.equal(true);
        });

        it("focuses an item within a selection other than the last if explicitly told to", () => {
            // Arrange
            const selection = new FileSelection();
            const fileSet = new FileSet();
            const selectedRange = new NumericRange(10, 20);

            // Act
            const nextSelection = selection.select({
                fileSet,
                index: selectedRange,
                sortOrder: 0,
                indexToFocus: 12,
            });

            // Assert
            expect(nextSelection.isFocused(fileSet, 12)).to.equal(true);
        });

        it("sorts selections first by sortOrder, then by index position within FileSet", () => {
            // Arrange
            const fileSet1 = new FileSet();
            const fileSet2 = new FileSet({
                filters: [new FileFilter("foo", "bar")],
            });
            const fileSet3 = new FileSet({
                filters: [new FileFilter("foo", "bar"), new FileFilter("something", "other")],
            });

            const selection = new FileSelection()
                .select({ fileSet: fileSet3, index: 100, sortOrder: 95 })
                .select({ fileSet: fileSet1, index: 3, sortOrder: 0 })
                .select({ fileSet: fileSet2, index: new NumericRange(8, 10), sortOrder: 1 })
                .select({ fileSet: fileSet1, index: new NumericRange(12, 15), sortOrder: 0 })
                .select({ fileSet: fileSet2, index: 33, sortOrder: 1 });

            // Act / Assert

            // to start, the first file focused should be the last selected
            expect(selection.isFocused(fileSet2, 33)).to.equal(true);

            // the first file by order, however, should be the first index selected within fileSet1
            expect(selection.focus(FocusDirective.FIRST).isFocused(fileSet1, 3)).to.equal(true);

            // next up should be the next file within fileSet1 selected
            expect(
                selection
                    .focus(FocusDirective.FIRST)
                    .focus(FocusDirective.NEXT)
                    .isFocused(fileSet1, 12)
            ).to.equal(true);

            // jumping to the end of the fileSet1 selections, advancing to the next item should
            // bring us to the first file selected within fileSet2
            expect(
                selection
                    .focusByFileSet(fileSet1, 15)
                    .focus(FocusDirective.NEXT)
                    .isFocused(fileSet2, 8)
            ).to.equal(true);

            // the last item should be from within fileSet3
            expect(selection.focus(FocusDirective.LAST).isFocused(fileSet3, 100)).to.equal(true);
        });
    });

    describe("deselect", () => {
        it("deselects a single file", () => {
            // Arrange
            const selection = new FileSelection()
                .select({ fileSet: new FileSet(), index: new NumericRange(0), sortOrder: 0 })
                .select({ fileSet: new FileSet(), index: new NumericRange(21, 30), sortOrder: 0 })
                .select({ fileSet: new FileSet(), index: new NumericRange(100), sortOrder: 0 });

            // Act
            const nextSelection = selection.deselect(new FileSet(), 25);

            // Assert
            expect(selection.isSelected(new FileSet(), 25)).to.equal(true);
            expect(nextSelection.isSelected(new FileSet(), 25)).to.equal(false);
            expect(nextSelection.count()).to.equal(selection.count() - 1);
        });

        it("deselects multiple files", () => {
            // Arrange
            const selection = new FileSelection()
                .select({ fileSet: new FileSet(), index: new NumericRange(0), sortOrder: 0 })
                .select({ fileSet: new FileSet(), index: new NumericRange(21, 30), sortOrder: 0 })
                .select({ fileSet: new FileSet(), index: new NumericRange(100), sortOrder: 0 });

            const rangeToDeselect = new NumericRange(22, 30);

            // Act
            const nextSelection = selection.deselect(new FileSet(), rangeToDeselect);

            // Assert
            // sanity-checks: previous selection
            expect(selection.isSelected(new FileSet(), rangeToDeselect)).to.equal(true);

            // deselection
            expect(nextSelection.isSelected(new FileSet(), rangeToDeselect)).to.equal(false);
            expect(nextSelection.count()).to.equal(selection.count() - rangeToDeselect.length);
        });

        it("produces an empty FileSelection instance if last remaining selection is removed", () => {
            // Arrange
            const selection = new FileSelection().select({
                fileSet: new FileSet(),
                index: new NumericRange(34),
                sortOrder: 0,
            });

            // Act
            const nextSelection = selection.deselect(new FileSet(), 34);

            // Assert
            expect(nextSelection.count()).to.equal(0);
        });

        it("keeps currently focused item if possible", () => {
            // Arrange
            const selection = new FileSelection()
                .select({ fileSet: new FileSet(), index: new NumericRange(0), sortOrder: 0 })
                .select({ fileSet: new FileSet(), index: new NumericRange(21, 30), sortOrder: 0 })
                .select({ fileSet: new FileSet(), index: new NumericRange(100), sortOrder: 0 })
                .focusByIndex(1);

            // Act
            const nextSelection = selection.deselect(new FileSet(), 100);

            // Assert
            // sanity-checks: previous selection
            expect(selection.isFocused(new FileSet(), 21)).to.equal(true);

            // deselection:
            expect(nextSelection.isFocused(new FileSet(), 21)).to.equal(true);
        });

        it("resets focused item when deselected file was previously focused - single deselection, first", () => {
            // Arrange
            const selection = new FileSelection()
                .select({ fileSet: new FileSet(), index: new NumericRange(0), sortOrder: 0 })
                .select({ fileSet: new FileSet(), index: new NumericRange(21, 30), sortOrder: 0 })
                .select({ fileSet: new FileSet(), index: new NumericRange(100), sortOrder: 0 })
                .focusByIndex(0);

            // Act
            const nextSelection = selection.deselect(new FileSet(), 0);

            // Assert
            // sanity-checks: previous selection
            expect(selection.isFocused(new FileSet(), 0)).to.equal(true);

            // deselection:
            expect(nextSelection.isFocused(new FileSet(), 21)).to.equal(true);
        });

        it("resets focused item when deselected file was previously focused - single deselection, middle", () => {
            // Arrange
            const selection = new FileSelection()
                .select({ fileSet: new FileSet(), index: new NumericRange(0), sortOrder: 0 })
                .select({ fileSet: new FileSet(), index: new NumericRange(21, 30), sortOrder: 0 })
                .select({ fileSet: new FileSet(), index: new NumericRange(100), sortOrder: 0 })
                .focusByFileSet(new FileSet(), 25);

            // Act
            const nextSelection = selection.deselect(new FileSet(), 25);

            // Assert
            // sanity-checks: previous selection
            expect(selection.isFocused(new FileSet(), 25)).to.equal(true);

            // deselection:
            expect(nextSelection.isFocused(new FileSet(), 24)).to.equal(true);
        });

        it("resets focused item when deselected file was previously focused - single deselection, last", () => {
            // Arrange
            const selection = new FileSelection()
                .select({ fileSet: new FileSet(), index: new NumericRange(0), sortOrder: 0 })
                .select({ fileSet: new FileSet(), index: new NumericRange(21, 30), sortOrder: 0 })
                .select({ fileSet: new FileSet(), index: new NumericRange(100), sortOrder: 0 });

            // Act
            const nextSelection = selection.deselect(new FileSet(), 100);

            // Assert
            // sanity-checks: previous selection
            expect(selection.isFocused(new FileSet(), 100)).to.equal(true);

            // deselection:
            expect(nextSelection.isFocused(new FileSet(), 30)).to.equal(true);
        });

        it("resets focused item when deselected file was previously focused - multiple deselection, first", () => {
            // Arrange
            const selection = new FileSelection()
                .select({ fileSet: new FileSet(), index: new NumericRange(0, 5), sortOrder: 0 })
                .select({ fileSet: new FileSet(), index: new NumericRange(21, 30), sortOrder: 0 })
                .select({ fileSet: new FileSet(), index: new NumericRange(97, 100), sortOrder: 0 })
                .focusByIndex(0);

            // Act
            const nextSelection = selection.deselect(new FileSet(), new NumericRange(0, 4));

            // Assert
            // sanity-checks: previous selection
            expect(selection.isFocused(new FileSet(), 0)).to.equal(true);

            // deselection:
            expect(nextSelection.isFocused(new FileSet(), 5)).to.equal(true);
        });

        it("resets focused item when deselected file was previously focused - multiple deselection, middle", () => {
            // Arrange
            const selection = new FileSelection()
                .select({ fileSet: new FileSet(), index: new NumericRange(0), sortOrder: 0 })
                .select({ fileSet: new FileSet(), index: new NumericRange(21, 30), sortOrder: 0 })
                .select({ fileSet: new FileSet(), index: new NumericRange(100), sortOrder: 0 })
                .focusByFileSet(new FileSet(), 25);

            // Act
            const nextSelection = selection.deselect(new FileSet(), new NumericRange(22, 30));

            // Assert
            // sanity-checks: previous selection
            expect(selection.isFocused(new FileSet(), 25)).to.equal(true);

            // deselection:
            expect(nextSelection.isFocused(new FileSet(), 21)).to.equal(true);
        });

        it("resets focused item when deselected file was previously focused - multiple deselection, last", () => {
            // Arrange
            const selection = new FileSelection()
                .select({ fileSet: new FileSet(), index: new NumericRange(0), sortOrder: 0 })
                .select({ fileSet: new FileSet(), index: new NumericRange(21, 30), sortOrder: 0 })
                .select({ fileSet: new FileSet(), index: new NumericRange(97, 100), sortOrder: 0 });

            // Act
            const nextSelection = selection.deselect(new FileSet(), new NumericRange(97, 100));

            // Assert
            // sanity-checks: previous selection
            expect(selection.isFocused(new FileSet(), 100)).to.equal(true);

            // deselection:
            expect(nextSelection.isFocused(new FileSet(), 30)).to.equal(true);
        });
    });

    describe("fetchAllDetails", () => {
        it("returns file details for each selected item", async () => {
            // Arrange
            const baseUrl = "test";
            const queryResult = [];
            for (let i = 0; i < 31; i++) {
                queryResult.push(i);
            }
            // Due to overfetching the result set we desire is a subsection of query results
            const expectedDetails = queryResult
                .slice(1, 31)
                .map((detail) => new FileDetail(detail as any));
            const httpClient = createMockHttpClient({
                when: `${baseUrl}/${HttpFileService.BASE_FILES_URL}?from=${0}&limit=${31}`,
                respondWith: {
                    data: { data: queryResult },
                },
            });
            const fileService = new HttpFileService({ baseUrl, httpClient });
            const selection = new FileSelection().select({
                fileSet: new FileSet({ fileService }),
                index: new NumericRange(1, 30),
                sortOrder: 0,
            });

            // Act
            const fileDetails = await selection.fetchAllDetails();

            // Assert
            expect(fileDetails).to.be.deep.equal(expectedDetails);
        });
    });

    describe("focus", () => {
        const fileSet1 = new FileSet();
        const fileSet2 = new FileSet({
            filters: [new FileFilter("Cell Line", "AICS-12")],
        });
        const baseSelection = new FileSelection()
            .select({ fileSet: fileSet1, index: new NumericRange(4, 100), sortOrder: 0 })
            .select({ fileSet: fileSet2, index: 77, sortOrder: 1 })
            .select({ fileSet: fileSet2, index: new NumericRange(103, 300), sortOrder: 1 })
            .select({ fileSet: fileSet1, index: 0, sortOrder: 0 });

        const spec = [
            {
                directive: FocusDirective.FIRST,
                expectation: {
                    fileSet: fileSet1,
                    fileSetIndex: 0,
                },
            },
            // effectively a noop when first is already selected
            {
                setup: (selection: FileSelection) => {
                    return selection.focusByIndex(0);
                },
                directive: FocusDirective.PREVIOUS,
                expectation: {
                    fileSet: fileSet1,
                    fileSetIndex: 0,
                },
            },
            {
                directive: FocusDirective.LAST,
                expectation: {
                    fileSet: fileSet2,
                    fileSetIndex: 300,
                },
            },
            // effectively a noop when the focused item is already at LAST
            {
                setup: (selection: FileSelection) => {
                    return selection.focusByIndex(selection.count() - 1);
                },
                directive: FocusDirective.NEXT,
                expectation: {
                    fileSet: fileSet2,
                    fileSetIndex: 300,
                },
            },
            {
                setup: (selection: FileSelection) => {
                    return selection.focusByFileSet(fileSet2, 77);
                },
                directive: FocusDirective.NEXT,
                expectation: {
                    fileSet: fileSet2,
                    fileSetIndex: 103,
                },
            },
            {
                setup: (selection: FileSelection) => {
                    return selection.focusByFileSet(fileSet2, 77);
                },
                directive: FocusDirective.PREVIOUS,
                expectation: {
                    fileSet: fileSet1,
                    fileSetIndex: 100,
                },
            },
        ];

        spec.forEach(({ setup = identity, directive, expectation }, idx) => {
            it(`(${idx}) focus by directive: ${directive}`, () => {
                // Arrange
                const prevSelection = setup(baseSelection);

                // Act
                const nextSelection = prevSelection?.focus(directive);

                // Assert
                expect(
                    nextSelection?.isFocused(expectation.fileSet, expectation.fileSetIndex)
                ).to.equal(true);
            });
        });

        it("handles FileSelection instances with single selections gracefully", () => {
            // Arrange
            const prevSelection = new FileSelection().select({
                fileSet: fileSet1,
                index: 48,
                sortOrder: 0,
            });

            [
                FocusDirective.FIRST,
                FocusDirective.PREVIOUS,
                FocusDirective.NEXT,
                FocusDirective.LAST,
            ].forEach((directive) => {
                // Act
                const nextSelection = prevSelection.focus(directive);

                // Assert
                expect(nextSelection.isFocused(fileSet1, 48)).to.equal(true);
            });
        });
    });

    describe("focusByIndex", () => {
        it("sets a specified selected row as focused", () => {
            // Arrange
            const fileSet1 = new FileSet();
            const fileSet2 = new FileSet({
                filters: [new FileFilter("foo", "bar")],
            });
            const prevSelection = new FileSelection()
                .select({ fileSet: fileSet1, index: new NumericRange(3, 10), sortOrder: 0 })
                .select({ fileSet: fileSet2, index: new NumericRange(1, 5000), sortOrder: 1 });

            // Act
            const nextSelection = prevSelection.focusByIndex(3);

            // Assert
            expect(prevSelection.isFocused(new FileSet(), 6)).to.equal(false);
            expect(nextSelection.isFocused(new FileSet(), 6)).to.equal(true);
        });

        it("throws an error if attempting to make an out-of-bounds selection", () => {
            // Arrange
            const selection = new FileSelection().select({
                fileSet: new FileSet(),
                index: new NumericRange(0, 45),
                sortOrder: 0,
            });

            // Act / Assert
            expect(() => {
                selection.focusByIndex(100);
            }).to.throw(IndexError);
        });
    });

    describe("focusByFileSet", () => {
        it("sets a specified selected row as focused", () => {
            // Arrange
            const fileSet1 = new FileSet();
            const fileSet2 = new FileSet({
                filters: [new FileFilter("foo", "bar")],
            });
            const prevSelection = new FileSelection()
                .select({ fileSet: fileSet1, index: new NumericRange(3, 10), sortOrder: 0 })
                .select({ fileSet: fileSet2, index: new NumericRange(1, 5000), sortOrder: 1 });

            // Act
            const nextSelection = prevSelection.focusByFileSet(fileSet2, 4086);

            // Assert
            expect(prevSelection.isFocused(fileSet2, 4086)).to.equal(false);
            expect(nextSelection.isFocused(fileSet2, 4086)).to.equal(true);
        });

        it("throws an error if attempting to make an invalid selection -- row within FileSet not selected", () => {
            // Arrange
            const selection = new FileSelection().select({
                fileSet: new FileSet(),
                index: new NumericRange(0, 45),
                sortOrder: 0,
            });

            // Act / Assert
            expect(() => {
                selection.focusByFileSet(new FileSet(), 2000);
            }).to.throw(ValueError);
        });

        it("throws an error if attempting to make an invalid selection -- FileSet itself not selected", () => {
            // Arrange
            const selectedFileSet = new FileSet();
            const notSelectedFileSet = new FileSet({
                filters: [new FileFilter("foo", "bar")],
            });
            const selection = new FileSelection().select({
                fileSet: selectedFileSet,
                index: new NumericRange(0, 45),
                sortOrder: 0,
            });

            // Act / Assert
            expect(() => {
                selection.focusByFileSet(notSelectedFileSet, 0);
            }).to.throw(ValueError);
        });
    });

    describe("size", () => {
        const pipeline4_4 = new FileFilter("Workflow", "Pipeline 4.4");
        const aics12 = new FileFilter("Cell Line", "AICS-12");
        const fileSet1 = new FileSet();
        const fileSet2 = new FileSet({
            filters: [aics12],
        });
        const fileSet3 = new FileSet({
            filters: [pipeline4_4, aics12],
        });
        const selection = new FileSelection()
            .select({ fileSet: fileSet1, index: new NumericRange(1, 10), sortOrder: 0 }) // 10 total
            .select({ fileSet: fileSet2, index: 3, sortOrder: 1 }) // 1 total
            .select({ fileSet: fileSet3, index: new NumericRange(21, 30), sortOrder: 2 }) // 10 total
            .select({ fileSet: fileSet1, index: 25, sortOrder: 0 }); // 1 total

        it("returns unfiltered size", () => {
            // Act
            const size = selection.count();

            // Assert
            expect(size).to.equal(22);
        });

        it("returns filtered size - filtered by fileset", () => {
            // Act
            const size = selection.count(fileSet1);

            // Assert
            expect(size).to.equal(11);
        });

        [
            { filters: [aics12], expected: 11 },
            { filters: [pipeline4_4], expected: 10 },
            { filters: [pipeline4_4, aics12], expected: 10 },
        ].forEach(({ filters, expected }, idx) => {
            it(`(${idx}) returns filtered size -- filtered by file filters`, () => {
                // Act
                const size = selection.count(filters);

                // Assert
                expect(size).to.equal(expected);
            });
        });
    });

    describe("groupByFileSet", () => {
        it("groups selections by filesets", () => {
            // Arrange
            const fileSet1 = new FileSet();
            const fileSet2 = new FileSet({
                filters: [new FileFilter("foo", "bar")],
            });
            const selection = new FileSelection()
                .select({ fileSet: fileSet1, index: 3, sortOrder: 0 })
                .select({ fileSet: fileSet2, index: new NumericRange(8, 10), sortOrder: 1 })
                .select({ fileSet: fileSet1, index: new NumericRange(12, 15), sortOrder: 0 })
                .select({ fileSet: fileSet2, index: 33, sortOrder: 1 });

            // Act
            const grouped = selection.groupByFileSet();

            // Assert
            expect(grouped.size).to.equal(2);
            expect(grouped.has(fileSet1)).to.equal(true);
            expect(grouped.has(fileSet2)).to.equal(true);
            expect(grouped.get(fileSet1)).to.deep.equal([
                new NumericRange(3),
                new NumericRange(12, 15),
            ]);
            expect(grouped.get(fileSet2)).to.deep.equal([
                new NumericRange(8, 10),
                new NumericRange(33),
            ]);
        });

        it("produces the most compact representation of numeric ranges possible", () => {
            // Arrange
            const fileSet = new FileSet();
            const selection = new FileSelection()
                .select({ fileSet, index: 3, sortOrder: 0 })
                .select({ fileSet, index: new NumericRange(4, 12), sortOrder: 0 })
                .select({ fileSet, index: 15, sortOrder: 0 })
                .select({ fileSet, index: new NumericRange(0, 2), sortOrder: 0 })
                .select({ fileSet, index: new NumericRange(99, 102), sortOrder: 0 });

            // Act
            const grouped = selection.groupByFileSet();

            // Assert
            expect(grouped.get(fileSet)).to.deep.equal([
                new NumericRange(0, 12),
                new NumericRange(15),
                new NumericRange(99, 102),
            ]);
        });
    });

    describe("toCompactSelectionList", () => {
        it("produces array of selections grouped by fileset", () => {
            // Arrange
            const fileSet1 = new FileSet();
            const fileSet2 = new FileSet({
                filters: [new FileFilter("foo", "bar")],
            });
            const selection = new FileSelection()
                .select({ fileSet: fileSet1, index: 3, sortOrder: 0 })
                .select({ fileSet: fileSet2, index: new NumericRange(8, 10), sortOrder: 1 })
                .select({ fileSet: fileSet1, index: new NumericRange(12, 15), sortOrder: 0 })
                .select({ fileSet: fileSet2, index: 33, sortOrder: 1 });

            // Act
            const selections = selection.toCompactSelectionList();

            // Assert
            expect(selections.length).to.equal(2);
            expect(selections[0].filters).to.be.empty;
            expect(selections[0].indexRanges).to.be.deep.equal([
                new NumericRange(3).toJSON(),
                new NumericRange(12, 15).toJSON(),
            ]);
            expect(selections[1].filters).to.be.deep.equal({ foo: ["bar"] });
            expect(selections[1].indexRanges).to.be.deep.equal([
                new NumericRange(8, 10).toJSON(),
                new NumericRange(33).toJSON(),
            ]);
        });

        it("produces the most compact representation of numeric ranges possible", () => {
            // Arrange
            const fileSet = new FileSet();
            const selection = new FileSelection()
                .select({ fileSet, index: 3, sortOrder: 0 })
                .select({ fileSet, index: new NumericRange(4, 12), sortOrder: 0 })
                .select({ fileSet, index: 15, sortOrder: 0 })
                .select({ fileSet, index: new NumericRange(0, 2), sortOrder: 0 })
                .select({ fileSet, index: new NumericRange(99, 102), sortOrder: 0 });

            // Act
            const selections = selection.toCompactSelectionList();

            // Assert
            expect(selections.length).to.equal(1);
            expect(selections[0].indexRanges).to.deep.equal([
                new NumericRange(0, 12).toJSON(),
                new NumericRange(15).toJSON(),
                new NumericRange(99, 102).toJSON(),
            ]);
        });
    });

    describe("hasNextFocusableItem", () => {
        const baseSelection = new FileSelection().select({
            fileSet: new FileSet(),
            index: new NumericRange(0, 9),
            sortOrder: 0,
        });

        const spec = [
            {
                setup: (selection: FileSelection): FileSelection => {
                    return selection.focusByIndex(0);
                },
                expectation: true,
            },
            {
                setup: (selection: FileSelection): FileSelection => {
                    return selection.focusByIndex(9);
                },
                expectation: false,
            },
            {
                setup: (selection: FileSelection): FileSelection => {
                    return selection.focusByIndex(5);
                },
                expectation: true,
            },
            {
                // test FileSelection of size 1
                setup: (): FileSelection => {
                    return new FileSelection()
                        .select({ fileSet: new FileSet(), index: 1, sortOrder: 0 })
                        .focusByIndex(0);
                },
                expectation: false,
            },
            {
                // test FileSelection of size 0
                setup: (): FileSelection => {
                    return new FileSelection();
                },
                expectation: false,
            },
        ];

        spec.forEach(({ setup, expectation }, idx) => {
            it(`(${idx}) returns ${expectation}`, () => {
                // Arrange
                const selection = setup(baseSelection);

                // Act
                const hasNext = selection.hasNextFocusableItem();

                // Assert
                expect(hasNext).to.equal(expectation);
            });
        });
    });

    describe("hasPreviousFocusableItem", () => {
        const baseSelection = new FileSelection().select({
            fileSet: new FileSet(),
            index: new NumericRange(0, 9),
            sortOrder: 0,
        });

        const spec = [
            {
                setup: (selection: FileSelection): FileSelection => {
                    return selection.focusByIndex(0);
                },
                expectation: false,
            },
            {
                setup: (selection: FileSelection): FileSelection => {
                    return selection.focusByIndex(9);
                },
                expectation: true,
            },
            {
                setup: (selection: FileSelection): FileSelection => {
                    return selection.focusByIndex(5);
                },
                expectation: true,
            },
            {
                // test FileSelection of size 1
                setup: (): FileSelection => {
                    return new FileSelection()
                        .select({ fileSet: new FileSet(), index: 1, sortOrder: 0 })
                        .focusByIndex(0);
                },
                expectation: false,
            },
            {
                // test FileSelection of size 0
                setup: (): FileSelection => {
                    return new FileSelection();
                },
                expectation: false,
            },
        ];

        spec.forEach(({ setup, expectation }, idx) => {
            it(`(${idx}) returns ${expectation}`, () => {
                // Arrange
                const selection = setup(baseSelection);

                // Act
                const hasNext = selection.hasPreviousFocusableItem();

                // Assert
                expect(hasNext).to.equal(expectation);
            });
        });
    });

    describe("selectionsAreEqual", () => {
        it("returns true when selections are equal", () => {
            // Arrange
            const fileSet = new FileSet();
            const selection1 = new FileSelection().select({
                fileSet,
                index: new NumericRange(0, 1),
                sortOrder: 0,
            });
            const selection2 = new FileSelection().select({
                fileSet,
                index: new NumericRange(0, 1),
                sortOrder: 0,
            });

            // Act
            const result = FileSelection.selectionsAreEqual(selection1, selection2);

            // Assert
            expect(result).to.be.true;
        });

        it("returns true even when another item is focused", () => {
            // Arrange
            const fileSet = new FileSet();
            const selection1 = new FileSelection()
                .select({ fileSet, index: new NumericRange(0, 1), sortOrder: 0 })
                .focus(FocusDirective.PREVIOUS);
            const selection2 = new FileSelection().select({
                fileSet,
                index: new NumericRange(0, 1),
                sortOrder: 0,
            });

            // Act
            const result = FileSelection.selectionsAreEqual(selection1, selection2);

            // Assert
            expect(result).to.be.true;
        });

        it("returns false when different file sets selection", () => {
            // Arrange
            const selection1 = new FileSelection().select({
                fileSet: new FileSet(),
                index: new NumericRange(0, 1),
                sortOrder: 0,
            });
            const selection2 = new FileSelection().select({
                fileSet: new FileSet(),
                index: new NumericRange(0, 3),
                sortOrder: 0,
            });

            // Act
            const result = FileSelection.selectionsAreEqual(selection1, selection2);

            // Assert
            expect(result).to.be.false;
        });

        it("returns false when different range in selection", () => {
            // Arrange
            const fileSet = new FileSet();
            const selection1 = new FileSelection().select({
                fileSet,
                index: new NumericRange(0, 1),
                sortOrder: 0,
            });
            const selection2 = new FileSelection().select({
                fileSet,
                index: new NumericRange(0, 3),
                sortOrder: 0,
            });

            // Act
            const result = FileSelection.selectionsAreEqual(selection1, selection2);

            // Assert
            expect(result).to.be.false;
        });

        it("returns false when different ranges exist in selection", () => {
            // Arrange
            const fileSet = new FileSet();
            const selection1 = new FileSelection().select({
                fileSet,
                index: new NumericRange(0, 1),
                sortOrder: 0,
            });
            const selection2 = new FileSelection()
                .select({ fileSet, index: new NumericRange(0, 1), sortOrder: 0 })
                .select({ fileSet: new FileSet(), index: new NumericRange(0, 1), sortOrder: 0 });

            // Act
            const result = FileSelection.selectionsAreEqual(selection1, selection2);

            // Assert
            expect(result).to.be.false;
        });
    });
});
