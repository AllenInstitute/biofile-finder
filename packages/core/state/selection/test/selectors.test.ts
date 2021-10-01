import { mergeState } from "@aics/redux-utils";
import { expect } from "chai";

import { initialState, selection, State } from "../..";
import { AnnotationName } from "../../../constants";
import FileFilter from "../../../entity/FileFilter";
import { Dataset } from "../../../services/DatasetService";

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

    describe("getSelectedCollection", () => {
        const expiration = new Date();
        expiration.setDate(expiration.getDate() + 1);
        const mockCollection: Dataset = {
            expiration,
            id: "123414",
            name: "Test Collection",
            version: 1,
            query: "",
            client: "",
            fixed: false,
            private: true,
            created: new Date(),
            createdBy: "test",
        };

        it("returns undefined when no collection selected", () => {
            // Act
            const actual = selection.selectors.getSelectedCollection(initialState);

            // Assert
            expect(actual).to.be.undefined;
        });

        it("returns undefined when selected collection is not active", () => {
            // Arrange
            const state: State = mergeState(initialState, {
                metadata: {
                    collections: [
                        {
                            ...mockCollection,
                            expiration: new Date(),
                        },
                    ],
                },
                selection: {
                    collectionId: mockCollection.id,
                },
            });

            // Act
            const actual = selection.selectors.getSelectedCollection(state);

            // Assert
            expect(actual).to.be.undefined;
        });

        it("returns collection when match found in active collections", () => {
            // Arrange
            const state: State = mergeState(initialState, {
                metadata: {
                    collections: [mockCollection],
                },
                selection: {
                    collectionId: mockCollection.id,
                },
            });

            // Act
            const actual = selection.selectors.getSelectedCollection(state);

            // Assert
            expect(actual).to.deep.equal(mockCollection);
        });
    });

    describe("getSelectedCollectionAnnotations", () => {
        const mockCollection: Dataset = {
            id: "123414",
            name: "Test Collection",
            version: 1,
            query: "",
            client: "",
            fixed: false,
            private: true,
            annotations: ["Cell Line", "Cas9", "Imaging Date"],
            created: new Date(),
            createdBy: "test",
        };

        it("return empty array when all possible annotations do not match", () => {
            // Arrange
            const state: State = mergeState(initialState, {
                metadata: {
                    collections: [mockCollection],
                },
                selection: {
                    collectionId: mockCollection.id,
                },
            });

            // Act
            const actual = selection.selectors.getSelectedCollectionAnnotations(state);

            // Assert
            expect(actual).to.be.empty;
        });

        it("returns matching annotations", () => {
            // Arrange
            const expected = (mockCollection.annotations as string[]).slice(0, 2).map((name) => ({
                name,
            }));
            const annotations = [
                ...expected,
                ...["Date", "Time"].map((name) => ({
                    name,
                    displayName: name,
                })),
            ];
            const state: State = mergeState(initialState, {
                metadata: {
                    annotations,
                    collections: [mockCollection],
                },
                selection: {
                    collectionId: mockCollection.id,
                },
            });

            // Act
            const actual = selection.selectors.getSelectedCollectionAnnotations(state);

            // Assert
            expect(actual).to.deep.equal(expected);
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
