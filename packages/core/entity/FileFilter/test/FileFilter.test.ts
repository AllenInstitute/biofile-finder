import { expect } from "chai";

import FileFilter, { FilterType } from "../";
import { AnnotationType } from "../../AnnotationFormatter";
import IncludeFilter from "../IncludeFilter";
import ExcludeFilter from "../ExcludeFilter";
import FuzzyFilter from "../FuzzyFilter";

describe("FileFilter", () => {
    describe("toSQLWhereString", () => {
        // path.length > 1 routes through buildNestedAccessExpression; the default pathIsArray for
        // ["Well","Dose","Unit"] is [true, false], producing this list expression.
        const NESTED_LIST = `list_transform("Well", x -> x."Dose"."Unit")`;

        // BOOLEAN: direct equality avoids CAST/regex mismatch on true/false values
        it("emits a boolean equality clause for boolean filter values", () => {
            expect(
                new FileFilter(
                    ["Is Control"],
                    true,
                    FilterType.DEFAULT,
                    AnnotationType.BOOLEAN
                ).toSQLWhereString()
            ).to.equal(`"Is Control" = true`);
            expect(
                new FileFilter(
                    ["Is Control"],
                    false,
                    FilterType.DEFAULT,
                    AnnotationType.BOOLEAN
                ).toSQLWhereString()
            ).to.equal(`"Is Control" = false`);
        });

        // NUMBER: RANGE(min,max) from NumberRangePicker must produce CAST AS DOUBLE comparison SQL
        it("emits a numeric range SQL clause for RANGE() filter values", () => {
            const filter = new FileFilter(
                ["Cell Count"],
                "RANGE(1, 50)",
                FilterType.DEFAULT,
                AnnotationType.NUMBER
            );
            expect(filter.toSQLWhereString()).to.equal(
                `CAST("Cell Count" AS DOUBLE) >= 1 AND CAST("Cell Count" AS DOUBLE) < 50`
            );
        });

        // DATE/DATETIME: RANGE(isoDate,isoDate) from DateRangePicker must produce TIMESTAMPTZ comparison SQL
        it("emits a date range SQL clause for RANGE() filter values with ISO date strings", () => {
            const filter = new FileFilter(
                ["Date Created"],
                "RANGE(2022-01-01T00:00:00.000Z,2022-01-31T00:00:00.000Z)",
                FilterType.DEFAULT,
                AnnotationType.DATETIME
            );
            expect(filter.toSQLWhereString()).to.equal(
                `CAST("Date Created" AS TIMESTAMPTZ) >= CAST('2022-01-01T00:00:00.000Z' AS TIMESTAMPTZ) AND CAST("Date Created" AS TIMESTAMPTZ) < CAST('2022-01-31T00:00:00.000Z' AS TIMESTAMPTZ)`
            );
        });

        // DURATION: INTERVAL columns use EXTRACT(epoch) to convert to ms for equality comparison
        it("emits an epoch extraction SQL clause for DURATION annotation type", () => {
            const filter = new FileFilter(
                ["Acquisition Duration"],
                60000,
                FilterType.DEFAULT,
                AnnotationType.DURATION
            );
            expect(filter.toSQLWhereString()).to.equal(
                `EXTRACT(epoch FROM "Acquisition Duration")::BIGINT * 1000 = 60000`
            );
        });

        it("checks for a non-empty extracted list for an ANY (include) filter", () => {
            expect(
                new FileFilter(["Well", "Dose", "Unit"], "", FilterType.ANY).toSQLWhereString()
            ).to.equal(`len(${NESTED_LIST}) > 0`);
        });

        it("checks for a null parent or empty extracted list for an EXCLUDE filter", () => {
            expect(
                new FileFilter(["Well", "Dose", "Unit"], "", FilterType.EXCLUDE).toSQLWhereString()
            ).to.equal(`("Well" IS NULL OR len(${NESTED_LIST}) = 0)`);
        });

        it("uses listContains for a FUZZY filter", () => {
            expect(
                new FileFilter(["Well", "Dose", "Unit"], "mg", FilterType.FUZZY).toSQLWhereString()
            ).to.equal(
                `list_has(list_transform(${NESTED_LIST}, __el -> CAST(__el AS VARCHAR)), 'mg')`
            );
        });

        it("emits list_has with a boolean literal for a nested BOOLEAN filter", () => {
            expect(
                new FileFilter(
                    ["Well", "Dose", "Unit"],
                    true,
                    FilterType.DEFAULT,
                    AnnotationType.BOOLEAN
                ).toSQLWhereString()
            ).to.equal(`list_has(${NESTED_LIST}, true)`);
        });

        // NUMBER values are compared as DOUBLE so "2.0" and "2" match (avoids string mismatch).
        it("emits list_has with a DOUBLE cast for a nested NUMBER filter", () => {
            expect(
                new FileFilter(
                    ["Well", "Dose", "Unit"],
                    "2",
                    FilterType.DEFAULT,
                    AnnotationType.NUMBER
                ).toSQLWhereString()
            ).to.equal(`list_has(${NESTED_LIST}, TRY_CAST('2' AS DOUBLE))`);
        });

        it("emits a list_filter range clause for a nested NUMBER RANGE filter", () => {
            expect(
                new FileFilter(
                    ["Well", "Dose", "Unit"],
                    "RANGE(1, 50)",
                    FilterType.DEFAULT,
                    AnnotationType.NUMBER
                ).toSQLWhereString()
            ).to.equal(
                `len(list_filter(${NESTED_LIST}, __el -> CAST(__el AS DOUBLE) >= 1 AND CAST(__el AS DOUBLE) < 50)) > 0`
            );
        });

        it("falls back to listContains for a nested untyped DEFAULT filter", () => {
            expect(new FileFilter(["Well", "Dose", "Unit"], "mg").toSQLWhereString()).to.equal(
                `list_has(list_transform(${NESTED_LIST}, __el -> CAST(__el AS VARCHAR)), 'mg')`
            );
        });
    });

    describe("toCorrelatedSQLWhereString", () => {
        it("returns a trivially-true clause for an empty filter list", () => {
            expect(FileFilter.toCorrelatedSQLWhereString([])).to.equal("1=1");
        });

        // Different sub-fields of the same parent must match within the SAME array element (AND'd).
        it("ANDs conditions on different sub-fields inside a single list_filter lambda", () => {
            const filters = [
                new FileFilter(["Items", "Color"], "blue"),
                new FileFilter(["Items", "Size"], "Large"),
            ];
            expect(FileFilter.toCorrelatedSQLWhereString(filters)).to.equal(
                `len(list_filter("Items", __e0 -> CAST(__e0."Color" AS VARCHAR) = 'blue' AND CAST(__e0."Size" AS VARCHAR) = 'Large')) > 0`
            );
        });

        // Multiple values for the SAME sub-field are OR'd together within the lambda.
        it("ORs multiple values for the same sub-field", () => {
            const filters = [
                new FileFilter(["Items", "Color"], "blue"),
                new FileFilter(["Items", "Color"], "red"),
            ];
            expect(FileFilter.toCorrelatedSQLWhereString(filters)).to.equal(
                `len(list_filter("Items", __e0 -> (CAST(__e0."Color" AS VARCHAR) = 'blue' OR CAST(__e0."Color" AS VARCHAR) = 'red'))) > 0`
            );
        });

        // NUMBER sub-fields compare as DOUBLE to avoid float/string mismatch.
        it("uses a DOUBLE comparison for a NUMBER sub-field", () => {
            const filters = [
                new FileFilter(["Items", "Count"], "2", FilterType.DEFAULT, AnnotationType.NUMBER),
            ];
            expect(FileFilter.toCorrelatedSQLWhereString(filters)).to.equal(
                `len(list_filter("Items", __e0 -> CAST(__e0."Count" AS DOUBLE) = TRY_CAST('2' AS DOUBLE))) > 0`
            );
        });

        // Non-DEFAULT (ANY/EXCLUDE/FUZZY) filters are emitted independently, not correlated.
        it("emits non-correlatable filters independently and ANDs them with the correlated clause", () => {
            const filters = [
                new FileFilter(["Items", "Color"], "", FilterType.ANY),
                new FileFilter(["Items", "Size"], "Large"),
            ];
            expect(FileFilter.toCorrelatedSQLWhereString(filters)).to.equal(
                `len(list_transform("Items", x -> x."Color")) > 0 AND ` +
                    `len(list_filter("Items", __e0 -> CAST(__e0."Size" AS VARCHAR) = 'Large')) > 0`
            );
        });

        // Single-quote escaping inside the lambda condition.
        it("escapes single quotes in a correlated string value", () => {
            const filters = [new FileFilter(["Items", "Name"], "O'Brien")];
            expect(FileFilter.toCorrelatedSQLWhereString(filters)).to.equal(
                `len(list_filter("Items", __e0 -> CAST(__e0."Name" AS VARCHAR) = 'O''Brien')) > 0`
            );
        });

        // Double-array nesting: both Well and Dose are STRUCT[], requiring a nested list_filter
        // so that Unit conditions are tested within the same Dose element (not independently).
        it("generates nested list_filter for a double-array intermediate (STRUCT[][])", () => {
            const filters = [
                // pathIsArray=[true,true]: Well is STRUCT[], Dose is STRUCT[]
                new FileFilter(["Well", "Dose", "Unit"], "uM", FilterType.DEFAULT, undefined, [
                    true,
                    true,
                ]),
                new FileFilter(["Well", "Dose", "Unit"], "mM", FilterType.DEFAULT, undefined, [
                    true,
                    true,
                ]),
                // pathIsArray=[true]: Well is STRUCT[], Color is a scalar leaf
                new FileFilter(["Well", "Color"], "blue", FilterType.DEFAULT, undefined, [true]),
            ];
            expect(FileFilter.toCorrelatedSQLWhereString(filters)).to.equal(
                `len(list_filter("Well", __e0 -> ` +
                    `len(list_filter(__e0."Dose", __e1 -> (CAST(__e1."Unit" AS VARCHAR) = 'uM' OR CAST(__e1."Unit" AS VARCHAR) = 'mM'))) > 0 ` +
                    `AND CAST(__e0."Color" AS VARCHAR) = 'blue')) > 0`
            );
        });

        // Scalar struct intermediate (pathIsArray[1]=false): dot-access, no nested list_filter.
        it("uses dot-access for scalar struct intermediates without an extra list_filter", () => {
            const filters = [
                new FileFilter(["Well", "Dose", "Unit"], "uM", FilterType.DEFAULT, undefined, [
                    true,
                    false,
                ]),
            ];
            expect(FileFilter.toCorrelatedSQLWhereString(filters)).to.equal(
                `len(list_filter("Well", __e0 -> CAST(__e0."Dose"."Unit" AS VARCHAR) = 'uM')) > 0`
            );
        });
    });

    describe("equals", () => {
        it("is backwards compatible when no type argument is provided", () => {
            // Arrange
            const fileFilterNoType = new FileFilter(["Annotation name"], "test value");
            const fileFilterWithType = new FileFilter(
                ["Annotation name"],
                "test value",
                FilterType.DEFAULT
            );

            // Act/Assert
            expect(fileFilterNoType.equals(fileFilterWithType));
        });
        it("returns true for include filter subtype and parent class", () => {
            // Arrange
            const fileFilterIncludeConstructor = new IncludeFilter(["Annotation name"]);
            const fileFilterParentConstructor = new FileFilter(
                ["Annotation name"],
                "",
                FilterType.ANY
            );

            // Act/Assert
            expect(fileFilterIncludeConstructor.equals(fileFilterParentConstructor));
        });
        it("returns true for exclude filter subtype and parent class", () => {
            // Arrange
            const fileFilterExcludeConstructor = new ExcludeFilter(["Annotation name"]);
            const fileFilterParentConstructor = new FileFilter(
                ["Annotation name"],
                "",
                FilterType.EXCLUDE
            );

            // Act/Assert
            expect(fileFilterExcludeConstructor.equals(fileFilterParentConstructor));
        });
        it("returns true for fuzzy filter subtype and parent class", () => {
            // Arrange
            const fileFilterFuzzyConstructor = new FuzzyFilter(
                "Annotation name",
                "annotation value"
            );
            const fileFilterParentConstructor = new FileFilter(
                ["Annotation name"],
                "annotation value",
                FilterType.FUZZY
            );

            // Act/Assert
            expect(fileFilterFuzzyConstructor.equals(fileFilterParentConstructor));
        });
        it("returns false for different filter subtypes", () => {
            // Arrange
            const fileFilter = new FileFilter(["Annotation name"], "annotation value");
            const fileFilterFuzzyConstructor = new FuzzyFilter(
                "Annotation name",
                "annotation value"
            );
            const fileFilterExcludeConstructor = new ExcludeFilter(["Annotation name"]);
            const fileFilterIncludeConstructor = new IncludeFilter(["Annotation name"]);

            // Act/Assert
            expect(!fileFilterFuzzyConstructor.equals(fileFilter));
            expect(!fileFilterIncludeConstructor.equals(fileFilterExcludeConstructor));
        });
    });
});
