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
    });
});
