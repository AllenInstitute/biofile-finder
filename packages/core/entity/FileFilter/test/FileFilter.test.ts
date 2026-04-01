import { expect } from "chai";

import FileFilter, { FilterType } from "../";
import IncludeFilter from "../IncludeFilter";
import ExcludeFilter from "../ExcludeFilter";
import FuzzyFilter from "../FuzzyFilter";

describe("FileFilter", () => {
    describe("toSQLWhereString", () => {
        // Ensures "any value" filters produce a presence check, not a value match
        it("emits IS NOT NULL for ANY filters", () => {
            const filter = new FileFilter("Cell Line", "", FilterType.ANY);
            expect(filter.toSQLWhereString()).to.equal(`"Cell Line" IS NOT NULL`);
        });

        // Ensures "no value" filters produce an absence check, not a value match
        it("emits IS NULL for EXCLUDE filters", () => {
            const filter = new FileFilter("Cell Line", "", FilterType.EXCLUDE);
            expect(filter.toSQLWhereString()).to.equal(`"Cell Line" IS NULL`);
        });

        // Ensures fuzzy text search uses regex matching, not strict equality
        it("emits a regex match for FUZZY filters", () => {
            const filter = new FileFilter("Cell Line", "AICS", FilterType.FUZZY);
            expect(filter.toSQLWhereString()).to.include("REGEXP_MATCHES");
        });

        // Guards against RANGE() detection bleeding into fuzzy filters, which share the same value format
        it("does not treat a RANGE()-shaped value as a range when filter type is FUZZY", () => {
            const filter = new FileFilter("Cell Count", "RANGE(1, 50)", FilterType.FUZZY);
            expect(filter.toSQLWhereString()).to.include("REGEXP_MATCHES");
        });

        // Boolean values must use direct equality, not regex, to avoid CAST case mismatch (DuckDB emits "true"/"false" lowercase)
        it("emits a boolean equality clause for boolean filter values", () => {
            const trueFilter = new FileFilter("Is Aligned", true);
            expect(trueFilter.toSQLWhereString()).to.equal(`"Is Aligned" = true`);

            const falseFilter = new FileFilter("Is Aligned", false);
            expect(falseFilter.toSQLWhereString()).to.equal(`"Is Aligned" = false`);
        });

        // Core numeric range behavior: RANGE() from NumberRangePicker must produce valid comparison SQL
        it("emits a numeric range SQL clause for RANGE() filter values", () => {
            const filter = new FileFilter("Cell Count", "RANGE(1, 50)");
            expect(filter.toSQLWhereString()).to.equal(
                `CAST("Cell Count" AS DOUBLE) >= 1 AND CAST("Cell Count" AS DOUBLE) < 50`
            );
        });

        // Ensures negative and decimal bounds are handled correctly by the RANGE() parser
        it("emits a numeric range SQL clause for negative/decimal RANGE() values", () => {
            const filter = new FileFilter("Score", "RANGE(-1.5, 3.14)");
            expect(filter.toSQLWhereString()).to.equal(
                `CAST("Score" AS DOUBLE) >= -1.5 AND CAST("Score" AS DOUBLE) < 3.14`
            );
        });

        // Ensures plain string values are not mistakenly parsed as range expressions
        it("emits a regex match for plain (non-range) DEFAULT values", () => {
            const filter = new FileFilter("Cell Line", "AICS-0");
            expect(filter.toSQLWhereString()).to.include("REGEXP_MATCHES");
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
            expect(fileFilterNoType.equals(fileFilterWithType));
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
            expect(fileFilterIncludeConstructor.equals(fileFilterParentConstructor));
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
            expect(fileFilterExcludeConstructor.equals(fileFilterParentConstructor));
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
            expect(fileFilterFuzzyConstructor.equals(fileFilterParentConstructor));
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
            expect(!fileFilterFuzzyConstructor.equals(fileFilter));
            expect(!fileFilterIncludeConstructor.equals(fileFilterExcludeConstructor));
        });
    });
});
