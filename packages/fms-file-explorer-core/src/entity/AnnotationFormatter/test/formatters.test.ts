import { expect } from "chai";

import booleanFormatter from "../boolean-formatter";
import dateFormatter from "../date-formatter";
import dateTimeFormatter from "../date-time-formatter";
import numberFormatter from "../number-formatter";

describe("Annotation formatters", () => {
    describe("Boolean annotation formatter", () => {
        it("turns true into 'True'", () => {
            ["true", "True", true].forEach((input) =>
                expect(booleanFormatter.displayValue(input)).to.equal("True")
            );
        });

        it("turns false into 'False'", () => {
            ["false", "False", false].forEach(() =>
                expect(booleanFormatter.displayValue("false")).to.equal("False")
            );
        });
    });

    describe("DateTime annotation formatter", () => {
        it("formats an ISO date string", () => {
            expect(dateTimeFormatter.displayValue("2017-12-06T01:54:01.332Z")).to.equal(
                "12/5/2017, 5:54:01 PM"
            );
        });
    });

    describe("Date annotation formatter", () => {
        const spec = [
            // str(datetime.datetime) format
            { input: "2018-04-28 00:00:00+00:00", expected: "2018-4-27" },

            // iso date string format
            { input: "2017-09-02T00:00:00.000Z", expected: "2017-9-1" },

            // no colon in UTC offset
            { input: "2018-05-24T00:00:00-0800", expected: "2018-5-24" },

            // with hour
            { input: "2018-05-24T08:00:00+00:00", expected: "2018-5-24" },

            // with other time positions filled in
            { input: "2018-05-24T08:01:32.123+00:00", expected: "2018-5-24" },

            // ahead UTC
            { input: "2018-05-24T00:00:00+08:00", expected: "2018-5-23" },

            // behind UTC
            { input: "2018-05-24T00:00:00-08:00", expected: "2018-5-24" },
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
});
