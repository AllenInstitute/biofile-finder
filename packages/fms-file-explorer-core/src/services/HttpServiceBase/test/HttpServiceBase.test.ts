import { expect } from "chai";

import HttpServiceBase from "../";

describe("HttpServiceBase", () => {
    describe("encodeURI", () => {
        it("is a noop if it does not have a query string", () => {
            expect(HttpServiceBase.encodeURI("http://foo.com/bar/baz/bat")).to.equal(
                "http://foo.com/bar/baz/bat"
            );
        });

        it("is a noop if query string is empty", () => {
            expect(HttpServiceBase.encodeURI("http://foo.com?")).to.equal("http://foo.com?");
        });

        it("encodes plus signs", () => {
            expect(
                HttpServiceBase.encodeURI("http://foo.com?2017-09-19T00:00:00.000+0000")
            ).to.equal("http://foo.com?2017-09-19T00:00:00.000%2b0000");
        });

        it("encodes spaces", () => {
            expect(HttpServiceBase.encodeURI("http://foo.com?Pipeline 4")).to.equal(
                "http://foo.com?Pipeline%204"
            );
        });

        it("encodes ampersands that do not separate query string components", () => {
            const queryString =
                "http://foo.com?workflow=R&DExp&cel3l_line=AICS-46&date=2017-09-19T00:00:00.000+0000&cTnT%=3.0&something else=foo bar";
            expect(HttpServiceBase.encodeURI(queryString)).to.equal(
                "http://foo.com?workflow=R%26DExp&cel3l_line=AICS-46&date=2017-09-19T00:00:00.000%2b0000&cTnT%25=3.0&something%20else=foo%20bar"
            );
        });

        it("encodes question marks that do not denote the start of the query string", () => {
            expect(HttpServiceBase.encodeURI("http://foo.com?Craters?=false")).to.equal(
                "http://foo.com?Craters%3F=false"
            );
        });
    });
});
