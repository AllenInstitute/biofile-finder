import { mergeState } from "@aics/redux-utils";
import { expect } from "chai";

import { initialState, metadata } from "../..";
import { Dataset } from "../../../services/DatasetService";

describe("Metadata selectors", () => {
    describe("getActiveCollections", () => {
        it("filters out expired collection", () => {
            // Arrange
            const futureExpiration = new Date();
            futureExpiration.setDate(futureExpiration.getDate() + 3);
            const expected: Dataset[] = [
                {
                    id: "123414",
                    name: "Test Collection",
                    version: 1,
                    query: "",
                    client: "",
                    fixed: false,
                    private: true,
                    expiration: futureExpiration,
                    created: new Date(),
                    createdBy: "test",
                },
                {
                    id: "123414",
                    name: "Test Collection",
                    version: 1,
                    query: "",
                    client: "",
                    fixed: false,
                    private: true,
                    created: new Date(),
                    createdBy: "test",
                },
            ];
            const expiredCollection: Dataset = {
                id: "123414",
                name: "Test Collection",
                version: 1,
                query: "",
                client: "",
                fixed: false,
                private: true,
                expiration: new Date(),
                created: new Date(),
                createdBy: "test",
            };
            const state = mergeState(initialState, {
                metadata: {
                    collections: [...expected, expiredCollection],
                },
            });

            // Act
            const actual = metadata.selectors.getActiveCollections(state);

            // Assert
            expect(actual).to.deep.equal(expected);
        });
    });
});
