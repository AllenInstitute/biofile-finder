import { expect } from "chai";

import { bindAll } from "../";

describe("General utilities", () => {
    describe("bindAll", () => {
        it("binds class methods to a class", () => {
            class Foo {
                private message = "Hello from Foo";

                constructor() {
                    bindAll(this, [this.bar]);
                }

                public bar() {
                    return this.message;
                }
            }

            const foo = new Foo();
            const bar = foo.bar;
            expect(foo.bar()).to.equal(bar());
        });

        it("does not bind a method that it was not asked to bind", () => {
            class Foo {
                private message = "Hello from Foo";

                constructor() {
                    bindAll(this, [this.bar]);
                }

                public bar() {
                    return this.message;
                }

                public baz() {
                    return this.message;
                }
            }

            const foo = new Foo();
            const baz = foo.baz;

            expect(foo.baz()).to.equal("Hello from Foo");
            expect(baz).to.throw(TypeError);
        });
    });
});
