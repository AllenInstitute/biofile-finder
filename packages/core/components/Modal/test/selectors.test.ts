import { mergeState } from "@aics/redux-utils";
import { expect } from "chai";

import { getSelectedCollectionAnnotations } from "../selectors";
import { initialState, State } from "../../../state";
import { Dataset } from "../../../services/DatasetService";

describe("<CollectionForm /> selectors", () => {
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
                selection: {
                    collection: mockCollection,
                },
            });

            // Act
            const actual = getSelectedCollectionAnnotations(state);

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
                },
                selection: {
                    collection: mockCollection,
                },
            });

            // Act
            const actual = getSelectedCollectionAnnotations(state);

            // Assert
            expect(actual).to.deep.equal(expected);
        });
    });
});
