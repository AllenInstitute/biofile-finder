import { expect } from "chai";

import booleanFormatter from "../boolean-formatter";
import dateFormatter from "../date-formatter";
import dateTimeFormatter from "../date-time-formatter";
import numberFormatter from "../number-formatter";
import durationFormatter from "../duration-formatter";

describe("Annotation formatters", () => {
    describe("Boolean annotation formatter", () => {
        it("displays true as 'True'", () => {
            ["true", "True", true].forEach((input) =>
                expect(booleanFormatter.displayValue(input)).to.equal("True")
            );
        });

        it("displays false as 'False'", () => {
            ["false", "False", false].forEach(() =>
                expect(booleanFormatter.displayValue("false")).to.equal("False")
            );
        });

        it("turns 'True' to true", () => {
            ["true", "True", true].forEach(
                (input) => expect(booleanFormatter.valueOf(input)).to.be.true
            );
        });

        it("turns 'False' to false", () => {
            ["false", "False", false].forEach(
                (input) => expect(booleanFormatter.valueOf(input)).to.be.false
            );
        });
    });

    describe("DateTime annotation formatter", () => {
        const spec = [
            // str(datetime.datetime) format
            { input: "2018-04-28 00:00:00+00:00", expected: "4/27/2018, 5:00:00 PM" },

            // iso date string format
            { input: "2017-12-06T01:54:01.332Z", expected: "12/5/2017, 5:54:01 PM" },

            // no colon in UTC offset
            { input: "2018-05-24T00:00:00-0800", expected: "5/24/2018, 1:00:00 AM" },

            // with hour
            { input: "2018-05-24T08:00:00+00:00", expected: "5/24/2018, 1:00:00 AM" },

            // with other time positions filled in
            { input: "2018-05-24T08:01:32.123+00:00", expected: "5/24/2018, 1:01:32 AM" },

            // ahead UTC
            { input: "2018-05-24T00:00:00+08:00", expected: "5/23/2018, 9:00:00 AM" },

            // behind UTC
            { input: "2018-05-24T00:00:00-08:00", expected: "5/24/2018, 1:00:00 AM" },
        ];

        spec.forEach((testCase) =>
            it(`sorts ${JSON.stringify(testCase.input)} to ${JSON.stringify(
                testCase.expected
            )}`, () => {
                expect(dateTimeFormatter.displayValue(testCase.input)).to.equal(testCase.expected);
            })
        );
    });

    describe("Date annotation formatter", () => {
        const spec = [
            // str(datetime.datetime) format
            { input: "2018-04-28 00:00:00+00:00", expected: "2018-04-28" },

            // iso date string format
            { input: "2017-09-02T00:00:00.000Z", expected: "2017-09-02" },

            // no microsecond
            { input: "2017-09-02T00:00:00Z", expected: "2017-09-02" },

            // no colon in UTC offset
            { input: "2018-05-24T00:00:00+0000", expected: "2018-05-24" },
        ];

        spec.forEach((testCase) => {
            it(`formats ${testCase.input} as a date (expected: ${testCase.expected})`, () => {
                expect(dateFormatter.displayValue(testCase.input)).to.equal(testCase.expected);
            });
        });
    });

    describe("Number annotation formatter", () => {
        it("formats a number without units", () => {
            expect(numberFormatter.displayValue(3)).to.equal("3");
        });

        it("formats a number with units", () => {
            expect(numberFormatter.displayValue(3, "moles")).to.equal("3 moles");
        });

        it("formats a number that represents bytes as human readable", () => {
            const KILOBYTE = 1024;
            expect(numberFormatter.displayValue(KILOBYTE * KILOBYTE * 7.5, "bytes")).to.equal(
                "7.5 MB"
            );
        });

        it("formats a value according to its type", () => {
            expect(numberFormatter.valueOf("3")).to.equal(3);
        });
    });

    describe("Duration annotation formatter", () => {
        it("formats a duration with all units", () => {
            expect(durationFormatter.displayValue(446582220)).to.equal("5D 4H 3M 2.22S");
        });

        it("formats a duration with only hours and seconds", () => {
            expect(durationFormatter.displayValue(10845000)).to.equal("3H 45S");
        });

        it("formats a duration with less than a second", () => {
            expect(durationFormatter.displayValue(125)).to.equal("0.125S");
        });
    });
});
