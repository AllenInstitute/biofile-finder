import { expect } from "chai";

import { buildPrefix } from "../useSizeSpecificPrefix";

describe("useSizeSpecificPrefix", () => {
    describe("buildPrefix", () => {
        it("returns full prefix when keptTrailing equals parents length", () => {
            const parents = ["Well", "Dose", "Solution"];
            const result = buildPrefix(parents, 3);
            expect(result).to.equal("Well / Dose / Solution / ");
        });

        it("returns ellipsis with trailing parents when keptTrailing is less than length", () => {
            const parents = ["Well", "Dose", "Solution"];
            const result = buildPrefix(parents, 2);
            expect(result).to.equal("… / Dose / Solution / ");
        });

        it("returns only ellipsis separator when keptTrailing is 0", () => {
            const parents = ["Well", "Dose", "Solution"];
            const result = buildPrefix(parents, 0);
            expect(result).to.equal("… / ");
        });

        it("keeps only the last parent when keptTrailing is 1", () => {
            const parents = ["Well", "Dose", "Solution"];
            const result = buildPrefix(parents, 1);
            expect(result).to.equal("… / Solution / ");
        });

        it("handles a single parent with full keep", () => {
            const parents = ["Well"];
            const result = buildPrefix(parents, 1);
            expect(result).to.equal("Well / ");
        });

        it("handles a single parent with zero keep", () => {
            const parents = ["Well"];
            const result = buildPrefix(parents, 0);
            expect(result).to.equal("… / ");
        });

        it("returns full prefix when keptTrailing exceeds parents length", () => {
            const parents = ["A", "B"];
            const result = buildPrefix(parents, 5);
            expect(result).to.equal("A / B / ");
        });

        it("handles empty parents array with keptTrailing 0 (treated as full prefix)", () => {
            // keptTrailing (0) >= parents.length (0), so takes the full-prefix branch
            const result = buildPrefix([], 0);
            expect(result).to.equal(" / ");
        });

        it("handles empty parents with keptTrailing >= length (returns separator only)", () => {
            const result = buildPrefix([], 1);
            expect(result).to.equal(" / ");
        });
    });
});
