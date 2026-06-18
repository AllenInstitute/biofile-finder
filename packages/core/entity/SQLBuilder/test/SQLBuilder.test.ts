import { expect } from "chai";

import SQLBuilder from "../";
import { AnnotationType } from "../../AnnotationFormatter";

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

    describe("regexContains", () => {
        it("builds a case-insensitive substring match", () => {
            expect(SQLBuilder.regexContains(`"Color"`, "red")).to.equal(
                `REGEXP_MATCHES(CAST("Color" AS VARCHAR), '(?i)red') = true`
            );
        });

        it("escapes regex special characters then SQL single quotes", () => {
            expect(SQLBuilder.regexContains(`x."Dose"."Unit"`, "1.5mg")).to.equal(
                `REGEXP_MATCHES(CAST(x."Dose"."Unit" AS VARCHAR), '(?i)1\\.5mg') = true`
            );
        });
    });

    describe("listRegexContains", () => {
        // The list analog of regexContains: substring-matches each element, then list_has(true).
        it("tests a case-insensitive substring against every list element", () => {
            expect(SQLBuilder.listRegexContains(`"Image QC"."Tags"`, "re")).to.equal(
                `list_has(list_transform("Image QC"."Tags", __el -> REGEXP_MATCHES(CAST(__el AS VARCHAR), '(?i)re') = true), true)`
            );
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

    describe("parseRangeBounds", () => {
        it("parses a numeric range", () => {
            expect(SQLBuilder.parseRangeBounds("RANGE(1, 50)")).to.deep.equal({
                min: "1",
                max: "50",
            });
        });

        it("parses an ISO-8601 timestamp range", () => {
            expect(
                SQLBuilder.parseRangeBounds(
                    "RANGE(2022-01-01T00:00:00.000Z, 2022-01-31T00:00:00.000Z)"
                )
            ).to.deep.equal({
                min: "2022-01-01T00:00:00.000Z",
                max: "2022-01-31T00:00:00.000Z",
            });
        });

        it("returns undefined for a plain (non-RANGE) value", () => {
            expect(SQLBuilder.parseRangeBounds("42")).to.be.undefined;
        });

        it("returns undefined when min or max contains unsafe characters", () => {
            expect(SQLBuilder.parseRangeBounds("RANGE(1; DROP TABLE files--, 50)")).to.be.undefined;
        });
    });

    describe("matchByType", () => {
        it("builds a regex multi-value match for strings by default", () => {
            const result = SQLBuilder.matchByType(`"Color"`, "Red", AnnotationType.STRING);
            expect(result).to.include("REGEXP_MATCHES");
            expect(result).to.include("Red");
        });

        it("builds an exact VARCHAR equality when exactMatchStrings is true", () => {
            expect(SQLBuilder.matchByType(`"Color"`, "Red", AnnotationType.STRING, true)).to.equal(
                `CAST("Color" AS VARCHAR) = 'Red'`
            );
        });

        it("escapes single quotes in string values", () => {
            expect(
                SQLBuilder.matchByType(`"Name"`, "O'Brien", AnnotationType.STRING, true)
            ).to.equal(`CAST("Name" AS VARCHAR) = 'O''Brien'`);
        });

        it("builds a boolean equality", () => {
            expect(SQLBuilder.matchByType(`"Flag"`, true, AnnotationType.BOOLEAN)).to.equal(
                `"Flag" = true`
            );
        });

        it("builds a DOUBLE equality for numbers", () => {
            expect(SQLBuilder.matchByType(`"Cell Count"`, "42", AnnotationType.NUMBER)).to.equal(
                `CAST("Cell Count" AS DOUBLE) = TRY_CAST('42' AS DOUBLE)`
            );
        });

        it("builds a duration equals condition", () => {
            expect(SQLBuilder.matchByType(`"Duration"`, 60000, AnnotationType.DURATION)).to.equal(
                `EXTRACT(epoch FROM "Duration")::BIGINT * 1000 = 60000`
            );
        });

        it("builds a doubleRange condition for a numeric RANGE value", () => {
            expect(
                SQLBuilder.matchByType(`"Cell Count"`, "RANGE(1, 50)", AnnotationType.NUMBER)
            ).to.equal(`CAST("Cell Count" AS DOUBLE) >= 1 AND CAST("Cell Count" AS DOUBLE) < 50`);
        });

        it("builds a timestampRange condition for a DATETIME RANGE value", () => {
            expect(
                SQLBuilder.matchByType(
                    `"Date Created"`,
                    "RANGE(2022-01-01T00:00:00.000Z, 2022-01-31T00:00:00.000Z)",
                    AnnotationType.DATETIME
                )
            ).to.equal(
                `CAST("Date Created" AS TIMESTAMPTZ) >= CAST('2022-01-01T00:00:00.000Z' AS TIMESTAMPTZ) AND CAST("Date Created" AS TIMESTAMPTZ) < CAST('2022-01-31T00:00:00.000Z' AS TIMESTAMPTZ)`
            );
        });
    });
});
