import { expect } from "chai";

import HttpServiceBase from "../";

describe("HttpServiceBase", () => {
    describe("encodeURIComponent", () => {
        it("encodes plus signs", () => {
            expect(HttpServiceBase.encodeURIComponent("2017-09-19T00:00:00.000+0000")).to.equal(
                "2017-09-19T00:00:00.000%2b0000"
            );
        });

        it("encodes spaces", () => {
            expect(HttpServiceBase.encodeURIComponent("Pipeline 4")).to.equal("Pipeline%204");
        });

        it("encodes ampersands that do not separate query string components", () => {
            const queryString =
                "workflow=R&DExp&cel3l_line=AICS-46&date=2017-09-19T00:00:00.000+0000&cTnT%=3.0&something else=foo bar";
            expect(HttpServiceBase.encodeURIComponent(queryString)).to.equal(
                "workflow=R%26DExp&cel3l_line=AICS-46&date=2017-09-19T00:00:00.000%2b0000&cTnT%25=3.0&something%20else=foo%20bar"
            );
        });
    });
});
