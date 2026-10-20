// Migrated from https://github.com/AllenCellSoftware/redux-utils (archived Nov 2025)
import { expect } from "chai";

import { ActionTracker } from "..";

describe("ActionTracker", () => {
    describe("list", () => {
        it("returns list of all tracked actions", () => {
            const tracker = new ActionTracker();
            const action = { type: "TEST" };
            tracker.track(action);

            expect(tracker.actions.list)
                .to.be.an("array")
                .and.to.be.of.length(1)
                .and.to.include(action);
        });
    });

    describe("includes", () => {
        it("tests tracked actions for deep equality", () => {
            const tracker = new ActionTracker();
            tracker.track({ type: "TEST", payload: [123] });

            expect(tracker.actions.includes({ type: "TEST", payload: [123] })).to.be.true;
        });
    });

    describe("includesInOrder", () => {
        it("tests for order in which actions were dispatched", () => {
            const tracker = new ActionTracker();
            tracker.track({ type: "TEST" });
            tracker.track({ type: "TEST2", payload: [123] });

            expect(
                tracker.actions.includesInOrder([
                    { type: "TEST" },
                    { type: "TEST2", payload: [123] },
                ])
            ).to.be.true;

            expect(
                tracker.actions.includesInOrder([
                    { type: "TEST2", payload: [123] },
                    { type: "TEST" },
                ])
            ).to.be.false;
        });
    });

    describe("includesMatch", () => {
        it("tests for actions that 'look like' the provided action", () => {
            const tracker = new ActionTracker();
            tracker.track({ type: "TEST", payload: [123] });

            expect(tracker.actions.includesMatch({ type: "TEST" })).to.be.true;
            expect(tracker.actions.includesMatch({ payload: [123] })).to.be.true;
        });
    });

    describe("includesMatchInOrder", () => {
        const tracker = new ActionTracker();
        tracker.track({ type: "TEST", payload: { nested: "obj" } });
        tracker.track({ type: "TEST2", payload: [123] });

        expect(tracker.actions.includesMatchesInOrder([{ type: "TEST" }, { payload: [123] }])).to.be
            .true;

        expect(tracker.actions.includesMatchesInOrder([{ payload: [123] }, { type: "TEST" }])).to.be
            .false;
    });
});
