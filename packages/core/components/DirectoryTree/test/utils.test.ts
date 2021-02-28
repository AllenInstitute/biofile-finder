import { expect } from "chai";
import { pick } from "lodash";

import { calcNodeSortOrder } from "../useDirectoryHierarchy";

describe("DirectoryTree utilities", () => {
    describe("calcNodeSortOrder", () => {
        [
            {
                idxWithinSourceList: 2,
                parentDepth: 1,
                parentSortOrder: 2,
                sourceListLength: 4,
                expectation: 2.2,
            },
            {
                idxWithinSourceList: 298,
                parentDepth: 1,
                parentSortOrder: 2,
                sourceListLength: 400,
                expectation: 2.298,
            },
            {
                idxWithinSourceList: 1,
                parentDepth: 3,
                parentSortOrder: 1,
                sourceListLength: 2,
                expectation: 1.0001,
            },
            {
                idxWithinSourceList: 0,
                parentDepth: 5,
                parentSortOrder: 7,
                sourceListLength: 200,
                expectation: 7,
            },
            {
                idxWithinSourceList: 123,
                parentDepth: 5,
                parentSortOrder: 7,
                sourceListLength: 200,
                expectation: 7.00000123,
            },
        ].forEach((spec, idx) => {
            it(`(${idx}) calculates the correct node sort order`, () => {
                // Arrange
                const params = pick(spec, [
                    "idxWithinSourceList",
                    "parentDepth",
                    "parentSortOrder",
                    "sourceListLength",
                ]);

                // Act
                const sortOrder = calcNodeSortOrder(params);

                // Assert
                expect(sortOrder).to.equal(spec.expectation);
            });
        });
    });
});
