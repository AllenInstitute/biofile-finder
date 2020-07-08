import { expect } from "chai";

import NumericRange from "..";

describe("NumericRange", () => {
    describe("compact", () => {
        it("combines ranges that overlap, are equal, or abut", () => {
            // arrange
            const range1 = new NumericRange(4, 7);
            const range2 = new NumericRange(4, 7); // entirely equal to range1
            const range3 = new NumericRange(1, 10); // encompasses range1/2
            const range4 = new NumericRange(-4, 2); // overlaps range3
            const range5 = new NumericRange(11, 20); // abuts range3

            const expected = [new NumericRange(-4, 20)];

            // act
            const actual = NumericRange.compact(range1, range2, range3, range4, range5);

            // assert
            expect(actual.length).to.equal(expected.length);
            actual.forEach((range, index) => {
                expect(range.equals(expected[index])).to.equal(
                    true,
                    `Expected ${range} to equal ${expected[index]}`
                );
            });
        });

        it("does not combine ranges that do not overlap", () => {
            // arrange
            const range1 = new NumericRange(4, 7);
            const range2 = new NumericRange(10, 20);

            const expected = [range1, range2];

            // act
            const actual = NumericRange.compact(range1, range2);

            // assert
            expect(actual.length).to.equal(expected.length);
            actual.forEach((range, index) => {
                expect(range.equals(expected[index])).to.equal(
                    true,
                    `Expected ${range} to equal ${expected[index]}`
                );
            });
        });
    });

    describe("fromRange", () => {
        it("creates ranges that compare equal, but not strictly", () => {
            // arrange
            const range = new NumericRange(1, 5);

            // act
            const copy = NumericRange.fromRange(range);

            // assert
            expect(range.equals(copy)).to.equal(true);
            expect(range === copy).to.equal(false);
            expect(range == copy).to.equal(false); // check double equals for completeness
        });
    });

    describe("isNumericRange", () => {
        it("returns true when given an instance of a NumericRange", () => {
            // arrange
            const range = new NumericRange(1, 5);

            // act / assert
            expect(NumericRange.isNumericRange(range)).to.equal(true);
        });

        it("returns false when not given an instance of a NumericRange", () => {
            // arrange
            const notRange = "Not a range";

            // act / assert
            expect(NumericRange.isNumericRange(notRange)).to.equal(false);
        });
    });

    describe("construction", () => {
        it("properly infers min and max of range even if given in wrong order", () => {
            // arrange
            const range = new NumericRange(10, -5);

            // assert
            expect(range.from).to.equal(-5);
            expect(range.to).to.equal(10);
        });

        it("sets max equal to min if only given one number", () => {
            // arrange
            const range = new NumericRange(5);

            // assert
            expect(range.from).to.equal(5);
            expect(range.to).to.equal(5);
        });
    });

    describe("abuts", () => {
        [
            {
                range: new NumericRange(1, 5),
                test: 6,
                expect: true,
            },
            {
                range: new NumericRange(1, 5),
                test: 7,
                expect: false,
            },
            {
                range: new NumericRange(1, 5),
                test: 0,
                expect: true,
            },
            {
                range: new NumericRange(1, 5),
                test: 1, // range bounds don't abut
                expect: false,
            },
            {
                range: new NumericRange(1, 5),
                test: 5, // range bounds don't abut
                expect: false,
            },
            {
                range: new NumericRange(1, 5),
                test: new NumericRange(6, 10),
                expect: true,
            },
            {
                range: new NumericRange(1, 5),
                test: new NumericRange(11, 20),
                expect: false,
            },
        ].forEach((testCase) => {
            it(`returns ${testCase.expect} for ${testCase.test} abuts ${testCase.range}`, () => {
                expect(testCase.range.abuts(testCase.test)).to.equal(testCase.expect);
            });
        });
    });

    describe("contains", () => {
        it("returns true if given a number within the range", () => {
            // arrange
            const range = new NumericRange(0, 500);

            // act / assert
            expect(range.contains(4)).to.equal(true);
        });

        it("returns true if given another range within the range", () => {
            // arrange
            const range = new NumericRange(0, 500);
            const other = new NumericRange(25, 100);

            // act / assert
            expect(range.contains(other)).to.equal(true);
        });

        it("returns true if given a number at the range bounds", () => {
            // arrange
            const range = new NumericRange(0, 500);

            // act / assert
            expect(range.contains(0)).to.equal(true);
            expect(range.contains(500)).to.equal(true);
        });

        it("returns true if given another range at the range bounds", () => {
            // arrange
            const range = new NumericRange(0, 500);
            const other1 = new NumericRange(0, 100);
            const other2 = new NumericRange(400, 500);

            // act / assert
            expect(range.contains(other1)).to.equal(true);
            expect(range.contains(other2)).to.equal(true);
        });

        it("returns false if given a number outside the range", () => {
            // arrange
            const range = new NumericRange(0, 500);

            // act / assert
            expect(range.contains(-4)).to.equal(false);
            expect(range.contains(501)).to.equal(false);
        });

        it("returns false if given another range outside the range", () => {
            // arrange
            const range = new NumericRange(0, 500);
            const other1 = new NumericRange(-3, -1);
            const other2 = new NumericRange(501, 502);

            // act / assert
            expect(range.contains(other1)).to.equal(false);
            expect(range.contains(other2)).to.equal(false);
        });

        it("returns false if given another range that is partially covered by range, but extends beyond it", () => {
            // arrange
            const range = new NumericRange(0, 500);
            const other = new NumericRange(100, 600);

            // act / assert
            expect(range.contains(other)).to.equal(false);
        });
    });

    describe("equals", () => {
        it("returns true when comparing the same instance", () => {
            // arrange
            const range = new NumericRange(1, 5);

            // act / assert
            expect(range.equals(range)).to.equal(true);
        });

        it("returns true when given two instances that represent the same range", () => {
            // arrange
            const range1 = new NumericRange(1, 5);
            const range2 = new NumericRange(1, 5);

            // act / assert
            expect(range1.equals(range2)).to.equal(true);
            expect(range2.equals(range1)).to.equal(true);
        });

        it("returns false when given two instances that represent different ranges", () => {
            // arrange
            const range1 = new NumericRange(1, 5);
            const range2 = new NumericRange(1, 6);

            // act / assert
            expect(range1.equals(range2)).to.equal(false);
            expect(range2.equals(range1)).to.equal(false);
        });
    });

    describe("expandTo", () => {
        it("expands a range's maximum", () => {
            // arrange
            const range = new NumericRange(1, 5);
            const to = 100;

            const expectation = new NumericRange(1, 100);

            // act
            const actual = range.expandTo(to);

            // assert
            expect(actual.equals(expectation)).to.equal(true);
        });

        it("expands a range's minimum", () => {
            // arrange
            const range = new NumericRange(1, 5);
            const to = -100;

            const expectation = new NumericRange(-100, 5);

            // act
            const actual = range.expandTo(to);

            // assert
            expect(actual.equals(expectation)).to.equal(true);
        });

        it("returns a new instance representing the same range if given a number contained within the instance", () => {
            // arrange
            const range = new NumericRange(1, 5);
            const to = 4;

            const expectation = new NumericRange(1, 5);

            // act
            const actual = range.expandTo(to);

            // assert
            expect(actual === expectation).to.equal(false);
            expect(actual.equals(expectation)).to.equal(true);
        });
    });

    describe("intersects", () => {
        [
            {
                range: new NumericRange(1, 5),
                test: new NumericRange(2, 6),
                expect: true,
            },
            {
                range: new NumericRange(1, 5),
                test: new NumericRange(5, 10),
                expect: true,
            },
            {
                range: new NumericRange(1, 5),
                test: new NumericRange(0, 2),
                expect: true,
            },
            {
                range: new NumericRange(1, 5),
                test: new NumericRange(0, 6),
                expect: true,
            },
            {
                range: new NumericRange(1, 5),
                test: new NumericRange(6, 7),
                expect: false,
            },
        ].forEach((testCase) => {
            it(`returns ${testCase.expect} for ${testCase.test} intersects ${testCase.range}`, () => {
                expect(testCase.range.intersects(testCase.test)).to.equal(testCase.expect);
            });
        });
    });

    describe("partitionAt", () => {
        it("throws an error if given a number not within the instance's continuous range", () => {
            // arrange
            const range = new NumericRange(1, 5);

            // act / assert
            expect(() => range.partitionAt(10)).to.throw();
        });

        it("throws an error if attempting to partition a range in which min === max", () => {
            // arrange
            const range = new NumericRange(5, 5);

            // act / assert
            expect(() => range.partitionAt(5)).to.throw();
        });

        it("splits a range into two around (excluding) a given number", () => {
            // arrange
            const range = new NumericRange(0, 100);

            const expected = [new NumericRange(0, 49), new NumericRange(51, 100)];

            // act
            const actual = range.partitionAt(50);

            // assert
            expect(actual.length).to.equal(expected.length);
            actual.forEach((range, index) => {
                expect(range.equals(expected[index])).to.equal(
                    true,
                    `Expected ${range} to equal ${expected[index]}`
                );
            });
        });

        it("works at its lower bound", () => {
            // arrange
            const range = new NumericRange(20, 50);
            const expected = [new NumericRange(21, 50)];

            // act
            const actual = range.partitionAt(20);

            // assert
            expect(actual.length).to.equal(expected.length);
            actual.forEach((range, index) => {
                expect(range.equals(expected[index])).to.equal(
                    true,
                    `Expected ${range} to equal ${expected[index]}`
                );
            });
        });

        it("works at its upper bound", () => {
            // arrange
            const range = new NumericRange(20, 50);
            const expected = [new NumericRange(20, 49)];

            // act
            const actual = range.partitionAt(50);

            // assert
            expect(actual.length).to.equal(expected.length);
            actual.forEach((range, index) => {
                expect(range.equals(expected[index])).to.equal(
                    true,
                    `Expected ${range} to equal ${expected[index]}`
                );
            });
        });
    });

    describe("union", () => {
        [
            {
                range: new NumericRange(1, 5),
                test: new NumericRange(2, 6),
                expect: new NumericRange(1, 6),
            },
            {
                range: new NumericRange(1, 5),
                test: new NumericRange(100, 500),
                expect: new NumericRange(1, 500),
            },
            {
                range: new NumericRange(1, 5),
                test: new NumericRange(3, 4),
                expect: new NumericRange(1, 5),
            },
            {
                range: new NumericRange(1, 5),
                test: new NumericRange(6, 10),
                expect: new NumericRange(1, 10),
            },
        ].forEach((testCase) => {
            it(`returns ${testCase.expect} for ${testCase.test} union ${testCase.range}`, () => {
                expect(testCase.range.union(testCase.test).equals(testCase.expect)).to.equal(true);
            });
        });
    });
});
