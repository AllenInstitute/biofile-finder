import { expect } from "chai";

import dateFormatter from "../date-formatter";
import numberFormatter from "../number-formatter";

describe("Annotation formatters", () => {
    describe("Date annotation formatter", () => {
        it("formats an ISO date string", () => {
            expect(dateFormatter("2017-12-06T01:54:01.332Z")).to.equal("12/5/2017, 5:54:01 PM");
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
