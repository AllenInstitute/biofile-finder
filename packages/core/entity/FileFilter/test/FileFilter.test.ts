import { expect } from "chai";

import FileFilter, { FilterType } from "../";
import { AnnotationType } from "../../AnnotationFormatter";
import IncludeFilter from "../IncludeFilter";
import ExcludeFilter from "../ExcludeFilter";
import FuzzyFilter from "../FuzzyFilter";

describe("FileFilter", () => {
    describe("toSQLWhereString", () => {
        // DATE/DATETIME: RANGE(isoDate,isoDate) from DateRangePicker must produce TIMESTAMPTZ comparison SQL
        it("emits a date range SQL clause for RANGE() filter values with ISO date strings", () => {
            const filter = new FileFilter(
                "Date Created",
                "RANGE(2022-01-01T00:00:00.000Z,2022-01-31T00:00:00.000Z)"
            );
            expect(filter.toSQLWhereString()).to.equal(
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
            expect(filter.toSQLWhereString()).to.equal(
                `EXTRACT(epoch FROM "Acquisition Duration")::BIGINT * 1000 = 60000`
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
