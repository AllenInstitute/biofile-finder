import { expect } from "chai";

import dateTimeFormatter from "../date-time-formatter";
import numberFormatter from "../number-formatter";

describe("Annotation formatters", () => {
    describe("Date/Time annotation formatter", () => {
        it("formats an ISO date string", () => {
            expect(dateTimeFormatter("2017-12-06T01:54:01.332Z")).to.equal("12/5/2017, 5:54:01 PM");
        });

        it("returns just the date portion if hours, minutes, and seconds are all zeroed out", () => {
            expect(dateTimeFormatter("2018-04-28 00:00:00+00:00")).to.equal("4/27/2018"); // str(datetime.datetime) format
            expect(dateTimeFormatter("2017-09-02T00:00:00.000Z")).to.equal("9/1/2017"); // iso date string format
        });
    });

    describe("Number annotation formatter", () => {
        it("formats a number without units", () => {
            expect(numberFormatter(3)).to.equal("3");
        });

        it("formats a number with units", () => {
            expect(numberFormatter(3, "moles")).to.equal("3 moles");
        });

        it("formats a number that represents bytes as human readable", () => {
            const KILOBYTE = 1024;
            expect(numberFormatter(KILOBYTE * KILOBYTE * 7.5, "bytes")).to.equal("7.5 MB");
        });
    });
});
