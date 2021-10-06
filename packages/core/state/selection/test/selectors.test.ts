import { expect } from "chai";

import { initialState, selection } from "../..";
import { AnnotationName } from "../../../constants";
import FileFilter from "../../../entity/FileFilter";

describe("Selection selectors", () => {
    describe("getAnnotationFilters", () => {
        it("filters out file attribute filter", () => {
            // Arrange
            const annotations = [AnnotationName.KIND, AnnotationName.TYPE, "Cell Line"];
            const annotationFilters = annotations.map((a) => new FileFilter(a, "any"));
            const filters = [...annotationFilters, new FileFilter(AnnotationName.FILE_SIZE, 12301)];
            const state = {
                ...initialState,
                selection: {
                    ...initialState.selection,
                    filters,
                },
            };

            // Act
            const actual = selection.selectors.getAnnotationFilters(state);

            // Assert
            expect(actual).to.deep.equal(annotationFilters);
        });

        it("filters nothing when all filters are for annotations", () => {
            // Arrange
            const annotations = [AnnotationName.KIND, AnnotationName.TYPE, "Cell Line"];
            const annotationFilters = annotations.map((a) => new FileFilter(a, "any"));
            const state = {
                ...initialState,
                selection: {
                    ...initialState.selection,
                    filters: annotationFilters,
                },
            };

            // Act
            const actual = selection.selectors.getAnnotationFilters(state);

            // Assert
            expect(actual).to.deep.equal(annotationFilters);
        });

        it("returns empty set when empty", () => {
            // Arrange
            const state = {
                ...initialState,
                selection: {
                    ...initialState.selection,
                    filters: [],
                },
            };

            // Act
            const actual = selection.selectors.getAnnotationFilters(state);

            // Assert
            expect(actual).to.be.empty;
        });
    });

    describe("getFileAttributeFilter", () => {
        it("filter down to file attribute filter", () => {
            // Arrange
            const annotations = [AnnotationName.KIND, AnnotationName.TYPE, "Cell Line"];
            const annotationFilters = annotations.map((a) => new FileFilter(a, "any"));
            const fileAttributeFilter = new FileFilter(
                AnnotationName.FILE_NAME,
                "my_cool_file.txt"
            );
            const filters = [...annotationFilters, fileAttributeFilter];
            const state = {
                ...initialState,
                selection: {
                    ...initialState.selection,
                    filters,
                },
            };

            // Act
            const actual = selection.selectors.getFileAttributeFilter(state);

            // Assert
            expect(actual).to.deep.equal(fileAttributeFilter);
        });

        it("returns undefined when no filters present", () => {
            // Arrange
            const state = {
                ...initialState,
                selection: {
                    ...initialState.selection,
                    filters: [],
                },
            };

            // Act
            const actual = selection.selectors.getFileAttributeFilter(state);

            // Assert
            expect(actual).to.be.undefined;
        });

        it("returns undefined when no file attribute filters present", () => {
            // Arrange
            const annotations = [AnnotationName.KIND, AnnotationName.TYPE, "Cell Line"];
            const annotationFilters = annotations.map((a) => new FileFilter(a, "any"));
            const state = {
                ...initialState,
                selection: {
                    ...initialState.selection,
                    filters: annotationFilters,
                },
            };

            // Act
            const actual = selection.selectors.getFileAttributeFilter(state);

            // Assert
            expect(actual).to.be.undefined;
        });
    });
});
