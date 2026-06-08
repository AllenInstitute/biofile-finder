import { expect } from "chai";

import FileSort, { SortOrder } from "../";

describe("FileSort", () => {
    describe("toOrderByClause", () => {
        it("emits a simple quoted column clause for a flat (single-segment) sort", () => {
            expect(new FileSort(["Cell Line"], SortOrder.ASC).toOrderByClause()).to.equal(
                `"Cell Line" ASC`
            );
            expect(new FileSort(["Cell Line"], SortOrder.DESC).toOrderByClause()).to.equal(
                `"Cell Line" DESC`
            );
        });

        // Nested sub-fields sort by the min element ([1]) when ascending. list_sort makes the
        // result deterministic regardless of the original element order in the array.
        it("sorts a nested sub-field by the minimum (index 1) when ascending", () => {
            expect(
                new FileSort(["Well", "Dose", "Unit"], SortOrder.ASC, [
                    true,
                    false,
                ]).toOrderByClause()
            ).to.equal(`list_sort(list_transform("Well", x -> x."Dose"."Unit"))[1] ASC`);
        });

        // Nested sub-fields sort by the max element ([-1]) when descending.
        it("sorts a nested sub-field by the maximum (index -1) when descending", () => {
            expect(
                new FileSort(["Well", "Dose", "Unit"], SortOrder.DESC, [
                    true,
                    false,
                ]).toOrderByClause()
            ).to.equal(`list_sort(list_transform("Well", x -> x."Dose"."Unit"))[-1] DESC`);
        });

        // pathIsArray defaults to [true, false, ...] when not supplied (see defaultPathIsArray).
        it("falls back to the default pathIsArray when none is provided", () => {
            expect(
                new FileSort(["Well", "Dose", "Unit"], SortOrder.ASC).toOrderByClause()
            ).to.equal(`list_sort(list_transform("Well", x -> x."Dose"."Unit"))[1] ASC`);
        });
    });

    describe("annotationName", () => {
        it("joins the path with dots", () => {
            expect(new FileSort(["Well", "Dose", "Unit"], SortOrder.ASC).annotationName).to.equal(
                "Well.Dose.Unit"
            );
        });
    });

    describe("equals", () => {
        it("returns true for the same path and order", () => {
            const a = new FileSort(["Well", "Dose", "Unit"], SortOrder.ASC);
            const b = new FileSort(["Well", "Dose", "Unit"], SortOrder.ASC);
            expect(a.equals(b)).to.equal(true);
        });

        it("returns false for a different order", () => {
            const a = new FileSort(["Well", "Dose", "Unit"], SortOrder.ASC);
            const b = new FileSort(["Well", "Dose", "Unit"], SortOrder.DESC);
            expect(a.equals(b)).to.equal(false);
        });

        it("returns false for a different path", () => {
            const a = new FileSort(["Well", "Dose", "Unit"], SortOrder.ASC);
            const b = new FileSort(["Well", "Dose", "Value"], SortOrder.ASC);
            expect(a.equals(b)).to.equal(false);
        });

        it("returns false when compared against undefined", () => {
            expect(new FileSort(["Well"], SortOrder.ASC).equals(undefined)).to.equal(false);
        });
    });

    describe("toJSON", () => {
        it("serializes the path as a JSON string alongside the order", () => {
            expect(new FileSort(["Well", "Dose", "Unit"], SortOrder.DESC).toJSON()).to.deep.equal({
                path: ["Well", "Dose", "Unit"],
                order: SortOrder.DESC,
            });
        });
    });
});
