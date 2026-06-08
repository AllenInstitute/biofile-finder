import { expect } from "chai";

import SQLBuilder from "../";

describe("SQLBuilder", () => {
    describe("buildNestedAccessExpression", () => {
        // Common case: only the root column is a STRUCT[]; intermediate is a scalar struct.
        it("uses a single list_transform with dot access when only the root is an array", () => {
            expect(
                SQLBuilder.buildNestedAccessExpression(["Well", "Dose", "Unit"], [true, false])
            ).to.equal(`list_transform("Well", x -> x."Dose"."Unit")`);
        });

        // Multiple array boundaries each introduce a list_transform and one flatten() level.
        it("nests list_transform + flatten for each intermediate array boundary", () => {
            expect(
                SQLBuilder.buildNestedAccessExpression(["Well", "Dose", "Unit"], [true, true])
            ).to.equal(
                `flatten(list_transform("Well", x -> list_transform(x."Dose", y -> y."Unit")))`
            );
        });

        // Rare case: a singular (non-array) struct at the root collapses to plain dot access.
        it("uses plain dot access when the root segment is a scalar struct", () => {
            expect(SQLBuilder.buildNestedAccessExpression(["Well", "Unit"], [false])).to.equal(
                `"Well"."Unit"`
            );
        });

        // Depth of 4 with only the root as an array stays a single list_transform.
        it("chains dot access for deep scalar-struct paths", () => {
            expect(
                SQLBuilder.buildNestedAccessExpression(
                    ["Well", "Dose", "Solution", "Name"],
                    [true, false, false]
                )
            ).to.equal(`list_transform("Well", x -> x."Dose"."Solution"."Name")`);
        });
    });

    describe("listContains", () => {
        // Elements are cast to VARCHAR so INTEGER/FLOAT list members match string UI values.
        it("casts list elements to VARCHAR and uses list_has", () => {
            expect(SQLBuilder.listContains(`list_transform("Well", x -> x."Unit")`, "mg")).to.equal(
                `list_has(list_transform(list_transform("Well", x -> x."Unit"), __el -> CAST(__el AS VARCHAR)), 'mg')`
            );
        });

        // Single quotes in the search value are escaped to avoid breaking the SQL literal.
        it("escapes single quotes in the search value", () => {
            expect(SQLBuilder.listContains("my_list", "O'Brien")).to.equal(
                `list_has(list_transform(my_list, __el -> CAST(__el AS VARCHAR)), 'O''Brien')`
            );
        });
    });

    describe("doubleRange", () => {
        it("builds a CAST AS DOUBLE range condition", () => {
            expect(SQLBuilder.doubleRange(`"Cell Count"`, "1", "50")).to.equal(
                `CAST("Cell Count" AS DOUBLE) >= 1 AND CAST("Cell Count" AS DOUBLE) < 50`
            );
        });

        it("works with a lambda variable", () => {
            expect(SQLBuilder.doubleRange("__el", "0", "100")).to.equal(
                `CAST(__el AS DOUBLE) >= 0 AND CAST(__el AS DOUBLE) < 100`
            );
        });
    });

    describe("timestampRange", () => {
        it("builds a CAST AS TIMESTAMPTZ range condition", () => {
            expect(
                SQLBuilder.timestampRange(
                    `"Date Created"`,
                    "2022-01-01T00:00:00.000Z",
                    "2022-01-31T00:00:00.000Z"
                )
            ).to.equal(
                `CAST("Date Created" AS TIMESTAMPTZ) >= CAST('2022-01-01T00:00:00.000Z' AS TIMESTAMPTZ) AND CAST("Date Created" AS TIMESTAMPTZ) < CAST('2022-01-31T00:00:00.000Z' AS TIMESTAMPTZ)`
            );
        });
    });

    describe("durationEquals", () => {
        it("builds an epoch-to-milliseconds equality condition", () => {
            expect(SQLBuilder.durationEquals(`"Acquisition Duration"`, 60000)).to.equal(
                `EXTRACT(epoch FROM "Acquisition Duration")::BIGINT * 1000 = 60000`
            );
        });

        it("works with a lambda variable", () => {
            expect(SQLBuilder.durationEquals("__el", 3000)).to.equal(
                `EXTRACT(epoch FROM __el)::BIGINT * 1000 = 3000`
            );
        });
    });

    describe("listSortOrderBy", () => {
        it("accesses index 1 (minimum) for ASC", () => {
            expect(
                SQLBuilder.listSortOrderBy(`list_transform("Well", x -> x."Dose")`, "ASC")
            ).to.equal(`list_sort(list_transform("Well", x -> x."Dose"))[1] ASC`);
        });

        it("accesses index -1 (maximum) for DESC", () => {
            expect(
                SQLBuilder.listSortOrderBy(`list_transform("Well", x -> x."Dose")`, "DESC")
            ).to.equal(`list_sort(list_transform("Well", x -> x."Dose"))[-1] DESC`);
        });
    });
});
