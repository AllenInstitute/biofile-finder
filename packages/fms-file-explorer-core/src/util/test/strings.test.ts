import { expect } from "chai";

import { naturalComparator } from "../strings";

describe("strings", () => {
    describe("naturalComparator", () => {
        it("sorts strings in a case-insensitive, natural way", () => {
            // arrange
            const input = ["aics-12", "AICS-1", "AICS-0", "AICS-2", "aics-0.5"];

            // act
            const out = [...input].sort(naturalComparator);

            // assert
            expect(out).to.deep.equal(["AICS-0", "aics-0.5", "AICS-1", "AICS-2", "aics-12"]);
        });

        it("sorts numbers in ascending order", () => {
            // arrange
            const input = [5, 2, 6.124, 1, 8, 0, -5, 10000];

            // act
            const out = [...input].sort(naturalComparator);

            // assert
            expect(out).to.deep.equal([-5, 0, 1, 2, 5, 6.124, 8, 10000]);
        });

        it("does nothing with lists that are not type homogenous and not strings/numbers", () => {
            // arrange
            const input = [false, true, 4];

            // act
            const out = [...input].sort(naturalComparator);

            // assert
            expect(out).to.deep.equal([false, true, 4]);
        });
    });
});
