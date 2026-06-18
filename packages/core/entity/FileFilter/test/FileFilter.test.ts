import { expect } from "chai";

import FileFilter, { FilterType } from "../";
import { AnnotationType } from "../../AnnotationFormatter";
import IncludeFilter from "../IncludeFilter";
import ExcludeFilter from "../ExcludeFilter";
import FuzzyFilter from "../FuzzyFilter";

describe("FileFilter", () => {
    describe("toSimpleWhereClause", () => {
        const NESTED_LIST = `list_transform("Well", x -> x."Dose"."Unit")`;
        const WELL_DOSE_UNIT_PATH_IS_ARRAY = [true, false, false];

        // BOOLEAN: direct equality avoids CAST/regex mismatch on true/false values
        it("emits a boolean equality clause for boolean filter values", () => {
            expect(
                new FileFilter(
                    "Is Control",
                    true,
                    FilterType.DEFAULT,
                    AnnotationType.BOOLEAN
                ).toSimpleWhereClause([])
            ).to.equal(`"Is Control" = true`);
            expect(
                new FileFilter(
                    "Is Control",
                    false,
                    FilterType.DEFAULT,
                    AnnotationType.BOOLEAN
                ).toSimpleWhereClause([])
            ).to.equal(`"Is Control" = false`);
        });

        // NUMBER: RANGE(min,max) from NumberRangePicker must produce CAST AS DOUBLE comparison SQL
        it("emits a numeric range SQL clause for RANGE() filter values", () => {
            const filter = new FileFilter(
                "Cell Count",
                "RANGE(1, 50)",
                FilterType.DEFAULT,
                AnnotationType.NUMBER
            );
            expect(filter.toSimpleWhereClause([])).to.equal(
                `CAST("Cell Count" AS DOUBLE) >= 1 AND CAST("Cell Count" AS DOUBLE) < 50`
            );
        });

        // DATE/DATETIME: RANGE(isoDate,isoDate) from DateRangePicker must produce TIMESTAMPTZ comparison SQL
        it("emits a date range SQL clause for RANGE() filter values with ISO date strings", () => {
            const filter = new FileFilter(
                "Date Created",
                "RANGE(2022-01-01T00:00:00.000Z,2022-01-31T00:00:00.000Z)",
                FilterType.DEFAULT,
                AnnotationType.DATETIME
            );
            expect(filter.toSimpleWhereClause([])).to.equal(
                `CAST("Date Created" AS TIMESTAMPTZ) >= CAST('2022-01-01T00:00:00.000Z' AS TIMESTAMPTZ) AND CAST("Date Created" AS TIMESTAMPTZ) < CAST('2022-01-31T00:00:00.000Z' AS TIMESTAMPTZ)`
            );
        });

        // DURATION: INTERVAL columns use EXTRACT(epoch) to convert to ms for equality comparison
        it("emits an epoch extraction SQL clause for DURATION annotation type", () => {
            const filter = new FileFilter(
                "Acquisition Duration",
                60000,
                FilterType.DEFAULT,
                AnnotationType.DURATION
            );
            expect(filter.toSimpleWhereClause([])).to.equal(
                `EXTRACT(epoch FROM "Acquisition Duration")::BIGINT * 1000 = 60000`
            );
        });

        it("checks for a non-empty extracted list for an ANY (include) filter", () => {
            expect(
                new FileFilter(["Well", "Dose", "Unit"], "", FilterType.ANY).toSimpleWhereClause(
                    WELL_DOSE_UNIT_PATH_IS_ARRAY
                )
            ).to.equal(`len(${NESTED_LIST}) > 0`);
        });

        it("checks for a null parent or empty extracted list for an EXCLUDE filter", () => {
            expect(
                new FileFilter(
                    ["Well", "Dose", "Unit"],
                    "",
                    FilterType.EXCLUDE
                ).toSimpleWhereClause(WELL_DOSE_UNIT_PATH_IS_ARRAY)
            ).to.equal(`("Well" IS NULL OR len(${NESTED_LIST}) = 0)`);
        });

        it("uses REGEXP_MATCHES inside the lambda for a nested FUZZY filter (case-insensitive substring)", () => {
            expect(
                new FileFilter(
                    ["Well", "Dose", "Unit"],
                    "mg",
                    FilterType.FUZZY
                ).toSimpleWhereClause(WELL_DOSE_UNIT_PATH_IS_ARRAY)
            ).to.equal(
                `list_has(list_transform("Well", x -> REGEXP_MATCHES(CAST(x."Dose"."Unit" AS VARCHAR), '(?i)mg') = true), true)`
            );
        });

        it("escapes regex special characters in the FUZZY search term", () => {
            expect(
                new FileFilter(
                    ["Well", "Dose", "Unit"],
                    "1.5mg",
                    FilterType.FUZZY
                ).toSimpleWhereClause(WELL_DOSE_UNIT_PATH_IS_ARRAY)
            ).to.equal(
                `list_has(list_transform("Well", x -> REGEXP_MATCHES(CAST(x."Dose"."Unit" AS VARCHAR), '(?i)1\\.5mg') = true), true)`
            );
        });

        it("emits a list_filter with a boolean equality for a nested BOOLEAN filter", () => {
            expect(
                new FileFilter(
                    ["Well", "Dose", "Unit"],
                    true,
                    FilterType.DEFAULT,
                    AnnotationType.BOOLEAN
                ).toSimpleWhereClause(WELL_DOSE_UNIT_PATH_IS_ARRAY)
            ).to.equal(`len(list_filter("Well", __e0 -> (__e0."Dose"."Unit" = true))) > 0`);
        });

        // NUMBER values are compared as DOUBLE so "2.0" and "2" match (avoids string mismatch).
        it("emits a list_filter with a DOUBLE cast for a nested NUMBER filter", () => {
            expect(
                new FileFilter(
                    ["Well", "Dose", "Unit"],
                    "2",
                    FilterType.DEFAULT,
                    AnnotationType.NUMBER
                ).toSimpleWhereClause(WELL_DOSE_UNIT_PATH_IS_ARRAY)
            ).to.equal(
                `len(list_filter("Well", __e0 -> (CAST(__e0."Dose"."Unit" AS DOUBLE) = TRY_CAST('2' AS DOUBLE)))) > 0`
            );
        });

        it("emits a list_filter range clause for a nested NUMBER RANGE filter", () => {
            expect(
                new FileFilter(
                    ["Well", "Dose", "Unit"],
                    "RANGE(1, 50)",
                    FilterType.DEFAULT,
                    AnnotationType.NUMBER
                ).toSimpleWhereClause(WELL_DOSE_UNIT_PATH_IS_ARRAY)
            ).to.equal(
                `len(list_filter("Well", __e0 -> (CAST(__e0."Dose"."Unit" AS DOUBLE) >= 1 AND CAST(__e0."Dose"."Unit" AS DOUBLE) < 50))) > 0`
            );
        });

        it("emits a list_filter with a VARCHAR cast for a nested untyped DEFAULT filter", () => {
            expect(
                new FileFilter(["Well", "Dose", "Unit"], "mg").toSimpleWhereClause(
                    WELL_DOSE_UNIT_PATH_IS_ARRAY
                )
            ).to.equal(
                `len(list_filter("Well", __e0 -> (CAST(__e0."Dose"."Unit" AS VARCHAR) = 'mg'))) > 0`
            );
        });

        // Scalar-struct sub-field, scalar leaf (pathIsArray all false, e.g.
        // "Image QC"."Focus Score"): a single dot-access value, matched without list ops.
        describe("scalar-struct sub-field with scalar leaf", () => {
            const SCALAR = [false, false]; // "Image QC" scalar struct, "Focus Score" scalar

            it("emits a plain dot-access equality for a DEFAULT filter", () => {
                expect(
                    new FileFilter(["Image QC", "Focus Score"], "0.5").toSimpleWhereClause(SCALAR)
                ).to.equal(`CAST("Image QC"."Focus Score" AS VARCHAR) = '0.5'`);
            });

            it("emits IS NOT NULL / IS NULL for ANY / EXCLUDE", () => {
                expect(
                    new FileFilter(
                        ["Image QC", "Focus Score"],
                        "",
                        FilterType.ANY
                    ).toSimpleWhereClause(SCALAR)
                ).to.equal(`"Image QC"."Focus Score" IS NOT NULL`);
                expect(
                    new FileFilter(
                        ["Image QC", "Focus Score"],
                        "",
                        FilterType.EXCLUDE
                    ).toSimpleWhereClause(SCALAR)
                ).to.equal(`"Image QC"."Focus Score" IS NULL`);
            });

            it("emits a case-insensitive substring match for FUZZY", () => {
                expect(
                    new FileFilter(
                        ["Image QC", "Focus Score"],
                        "0.5",
                        FilterType.FUZZY
                    ).toSimpleWhereClause(SCALAR)
                ).to.equal(
                    `REGEXP_MATCHES(CAST("Image QC"."Focus Score" AS VARCHAR), '(?i)0\\.5') = true`
                );
            });
        });

        // Sub-field whose LEAF is itself a list (e.g. "Image QC"."Tags" : VARCHAR[]).
        // The dot-access expression is a LIST, matched by membership, not scalar equality.
        describe("scalar-struct root with list leaf (e.g. VARCHAR[])", () => {
            const LEAF_ARRAY = [false, true]; // "Image QC" scalar struct, "Tags" is VARCHAR[]

            it("matches DEFAULT by list membership", () => {
                expect(
                    new FileFilter(["Image QC", "Tags"], "Red").toSimpleWhereClause(LEAF_ARRAY)
                ).to.equal(
                    `list_has(list_transform("Image QC"."Tags", __el -> CAST(__el AS VARCHAR)), 'Red')`
                );
            });

            it("matches FUZZY by case-insensitive substring across elements", () => {
                expect(
                    new FileFilter(
                        ["Image QC", "Tags"],
                        "re",
                        FilterType.FUZZY
                    ).toSimpleWhereClause(LEAF_ARRAY)
                ).to.equal(
                    `list_has(list_transform("Image QC"."Tags", __el -> REGEXP_MATCHES(CAST(__el AS VARCHAR), '(?i)re') = true), true)`
                );
            });

            it("uses len-based checks for ANY / EXCLUDE", () => {
                expect(
                    new FileFilter(["Image QC", "Tags"], "", FilterType.ANY).toSimpleWhereClause(
                        LEAF_ARRAY
                    )
                ).to.equal(`len("Image QC"."Tags") > 0`);
                expect(
                    new FileFilter(
                        ["Image QC", "Tags"],
                        "",
                        FilterType.EXCLUDE
                    ).toSimpleWhereClause(LEAF_ARRAY)
                ).to.equal(`("Image QC" IS NULL OR len("Image QC"."Tags") = 0)`);
            });
        });

        // STRUCT[] root AND a list leaf (e.g. "Treatment"[]."Tags" : VARCHAR[]): the leaf
        // condition is a membership test inside the list_filter lambda over the root.
        it("matches a list leaf under a STRUCT[] root via list_contains inside list_filter", () => {
            expect(
                new FileFilter(["Treatment", "Tags"], "mg").toSimpleWhereClause([true, true])
            ).to.equal(
                `len(list_filter("Treatment", __e0 -> (list_has(list_transform(__e0."Tags", __el -> CAST(__el AS VARCHAR)), 'mg')))) > 0`
            );
        });
    });

    describe("toListOfWhereClauses", () => {
        it("returns an empty array for an empty filter list", () => {
            expect(FileFilter.toListOfWhereClauses([], new Map())).to.deep.equal([]);
        });

        // Different sub-fields of the same parent must match within the SAME array element (AND'd).
        it("ANDs conditions on different sub-fields inside a single list_filter lambda", () => {
            const filters = [
                new FileFilter(["Items", "Color"], "blue"),
                new FileFilter(["Items", "Size"], "Large"),
            ];
            const pathIsArrayByName = new Map([
                ["Items.Color", [true, false]],
                ["Items.Size", [true, false]],
            ]);
            expect(FileFilter.toListOfWhereClauses(filters, pathIsArrayByName)).to.deep.equal([
                `len(list_filter("Items", __e0 -> (CAST(__e0."Color" AS VARCHAR) = 'blue') AND (CAST(__e0."Size" AS VARCHAR) = 'Large'))) > 0`,
            ]);
        });

        // Multiple values for the SAME sub-field are OR'd together within the lambda.
        it("ORs multiple values for the same sub-field", () => {
            const filters = [
                new FileFilter(["Items", "Color"], "blue"),
                new FileFilter(["Items", "Color"], "red"),
            ];
            const pathIsArrayByName = new Map([["Items.Color", [true, false]]]);
            expect(FileFilter.toListOfWhereClauses(filters, pathIsArrayByName)).to.deep.equal([
                `len(list_filter("Items", __e0 -> (CAST(__e0."Color" AS VARCHAR) = 'blue' OR CAST(__e0."Color" AS VARCHAR) = 'red'))) > 0`,
            ]);
        });

        // NUMBER sub-fields compare as DOUBLE to avoid float/string mismatch.
        it("uses a DOUBLE comparison for a NUMBER sub-field", () => {
            const filters = [
                new FileFilter(["Items", "Count"], "2", FilterType.DEFAULT, AnnotationType.NUMBER),
            ];
            const pathIsArrayByName = new Map([["Items.Count", [true, false]]]);
            expect(FileFilter.toListOfWhereClauses(filters, pathIsArrayByName)).to.deep.equal([
                `len(list_filter("Items", __e0 -> (CAST(__e0."Count" AS DOUBLE) = TRY_CAST('2' AS DOUBLE)))) > 0`,
            ]);
        });

        it("emits non-correlatable filters as a separate clause from the correlated one", () => {
            const filters = [
                new FileFilter(["Items", "Color"], "", FilterType.ANY),
                new FileFilter(["Items", "Size"], "Large"),
            ];
            const pathIsArrayByName = new Map([
                ["Items.Color", [true, false]],
                ["Items.Size", [true, false]],
            ]);
            expect(FileFilter.toListOfWhereClauses(filters, pathIsArrayByName)).to.deep.equal([
                `len(list_transform("Items", x -> x."Color")) > 0`,
                `len(list_filter("Items", __e0 -> (CAST(__e0."Size" AS VARCHAR) = 'Large'))) > 0`,
            ]);
        });

        // Single-quote escaping inside the lambda condition.
        it("escapes single quotes in a correlated string value", () => {
            const filters = [new FileFilter(["Items", "Name"], "O'Brien")];
            const pathIsArrayByName = new Map([["Items.Name", [true, false]]]);
            expect(FileFilter.toListOfWhereClauses(filters, pathIsArrayByName)).to.deep.equal([
                `len(list_filter("Items", __e0 -> (CAST(__e0."Name" AS VARCHAR) = 'O''Brien'))) > 0`,
            ]);
        });

        // Double-array nesting: both Well and Dose are STRUCT[], requiring a nested list_filter
        // so that Unit conditions are tested within the same Dose element (not independently).
        it("generates nested list_filter for a double-array intermediate (STRUCT[][])", () => {
            const filters = [
                new FileFilter(["Well", "Dose", "Unit"], "uM"),
                new FileFilter(["Well", "Dose", "Unit"], "mM"),
                new FileFilter(["Well", "Color"], "blue"),
            ];
            const pathIsArrayByName = new Map([
                // Well is STRUCT[], Dose is STRUCT[]
                ["Well.Dose.Unit", [true, true, false]],
                // Well is STRUCT[], Color is a scalar leaf
                ["Well.Color", [true, false]],
            ]);
            expect(FileFilter.toListOfWhereClauses(filters, pathIsArrayByName)).to.deep.equal([
                `len(list_filter("Well", __e0 -> ` +
                    `len(list_filter(__e0."Dose", __e1 -> (CAST(__e1."Unit" AS VARCHAR) = 'uM' OR CAST(__e1."Unit" AS VARCHAR) = 'mM'))) > 0 ` +
                    `AND (CAST(__e0."Color" AS VARCHAR) = 'blue'))) > 0`,
            ]);
        });

        // Scalar struct intermediate (pathIsArray[1]=false): dot-access, no nested list_filter.
        it("uses dot-access for scalar struct intermediates without an extra list_filter", () => {
            const filters = [new FileFilter(["Well", "Dose", "Unit"], "uM")];
            const pathIsArrayByName = new Map([["Well.Dose.Unit", [true, false, false]]]);
            expect(FileFilter.toListOfWhereClauses(filters, pathIsArrayByName)).to.deep.equal([
                `len(list_filter("Well", __e0 -> (CAST(__e0."Dose"."Unit" AS VARCHAR) = 'uM'))) > 0`,
            ]);
        });

        // A scalar-struct root (pathIsArray=[false]) is NOT correlatable: it has no array
        // element to test, so it is emitted as a plain condition rather than a list_filter.
        it("emits scalar-struct DEFAULT filters as plain conditions, not list_filter", () => {
            const filters = [new FileFilter(["Image QC", "Focus Score"], "0.5")];
            const pathIsArrayByName = new Map([["Image QC.Focus Score", [false, false]]]);
            expect(FileFilter.toListOfWhereClauses(filters, pathIsArrayByName)).to.deep.equal([
                `CAST("Image QC"."Focus Score" AS VARCHAR) = '0.5'`,
            ]);
        });

        // Nested annotations absent from the schema map are a programming error: we throw
        // rather than guess (a wrong guess emits list ops against a possibly-scalar struct).
        it("throws when a nested filter's annotation is missing from the map", () => {
            const filters = [new FileFilter(["Well", "Dose", "Unit"], "uM")];
            expect(() => FileFilter.toListOfWhereClauses(filters, new Map())).to.throw(
                /Well\.Dose\.Unit/
            );
        });
    });

    describe("equals", () => {
        it("is backwards compatible when no type argument is provided", () => {
            // Arrange
            const fileFilterNoType = new FileFilter("Annotation name", "test value");
            const fileFilterWithType = new FileFilter(
                "Annotation name",
                "test value",
                FilterType.DEFAULT
            );

            // Act/Assert
            expect(fileFilterNoType.equals(fileFilterWithType)).to.be.true;
        });
        it("returns true for include filter subtype and parent class", () => {
            // Arrange
            const fileFilterIncludeConstructor = new IncludeFilter("Annotation name");
            const fileFilterParentConstructor = new FileFilter(
                "Annotation name",
                "",
                FilterType.ANY
            );

            // Act/Assert
            expect(fileFilterIncludeConstructor.equals(fileFilterParentConstructor)).to.be.true;
        });
        it("returns true for exclude filter subtype and parent class", () => {
            // Arrange
            const fileFilterExcludeConstructor = new ExcludeFilter("Annotation name");
            const fileFilterParentConstructor = new FileFilter(
                "Annotation name",
                "",
                FilterType.EXCLUDE
            );

            // Act/Assert
            expect(fileFilterExcludeConstructor.equals(fileFilterParentConstructor)).to.be.true;
        });
        it("returns true for fuzzy filter subtype and parent class", () => {
            // Arrange
            const fileFilterFuzzyConstructor = new FuzzyFilter(
                "Annotation name",
                "annotation value"
            );
            const fileFilterParentConstructor = new FileFilter(
                "Annotation name",
                "annotation value",
                FilterType.FUZZY
            );

            // Act/Assert
            expect(fileFilterFuzzyConstructor.equals(fileFilterParentConstructor)).to.be.true;
        });
        it("returns false for different filter subtypes", () => {
            // Arrange
            const fileFilter = new FileFilter("Annotation name", "annotation value");
            const fileFilterFuzzyConstructor = new FuzzyFilter(
                "Annotation name",
                "annotation value"
            );
            const fileFilterExcludeConstructor = new ExcludeFilter("Annotation name");
            const fileFilterIncludeConstructor = new IncludeFilter("Annotation name");

            // Act/Assert
            expect(fileFilterFuzzyConstructor.equals(fileFilter)).to.be.false;
            expect(fileFilterIncludeConstructor.equals(fileFilterExcludeConstructor)).to.be.false;
        });
    });
});
