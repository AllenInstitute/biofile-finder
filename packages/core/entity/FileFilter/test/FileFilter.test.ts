import { expect } from "chai";

import FileFilter, { FilterType } from "../";
import IncludeFilter from "../IncludeFilter";
import ExcludeFilter from "../ExcludeFilter";
import FuzzyFilter from "../FuzzyFilter";

describe("FileFilter", () => {
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
