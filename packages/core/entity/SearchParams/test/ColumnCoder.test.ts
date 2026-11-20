import { expect } from "chai";
import { describe, it } from "mocha";

import ColumnCoder, { PREFIX_MARKER } from "../ColumnCoder";

describe("ColumnCoder", () => {
    describe("buildPrefixesFromFullPaths", () => {
        it("returns prefixes for single annotation paths", () => {
            // arrange
            const columnNames = [["Gene"], ["Cell line"], ["Cas9"]];
            const expectedPrefixes = ["g", "ce", "ca"];

            // act
            const actualPrefixMap = ColumnCoder.buildPrefixesFromFullPaths(columnNames);

            // assert
            expect(actualPrefixMap.size).to.equal(expectedPrefixes.length);
            expectedPrefixes.forEach((prefix) => {
                expect([...actualPrefixMap.values()].some((p) => p === `${prefix}${PREFIX_MARKER}`))
                    .to.be.true;
            });
        });

        it("returns prefixes for nested annotation paths", () => {
            // arrange
            const columnNames = [
                ["Well", "Dose", "Color"],
                ["Well", "Dose", "Concentration"],
                ["Well", "Description"],
                ["Well", "ID"],
                ["Whatever", "Else"],
            ];
            const expectedPrefixes = [
                "we~.do~.col~",
                "we~.do~.con~",
                "we~.de~",
                "we~.ID", // ID is only two characters long, so uses its full name since the prefix would be the same length
                "wh~.e~",
            ];

            // act
            const actualPrefixMap = ColumnCoder.buildPrefixesFromFullPaths(columnNames);

            // assert
            expect(actualPrefixMap.size).to.equal(expectedPrefixes.length);
            expectedPrefixes.forEach((prefix) => {
                expect([...actualPrefixMap.values()].some((p) => p === prefix)).to.be.true;
            });
        });

        // TO DO: This might actually be an existing bug that needs addressing
        it.skip("differentiates between nested paths and flat paths containing dots", () => {
            const columnNames = [["Well", "ID"], ["Well.ID"]];

            // act
            const actualPrefixMap = ColumnCoder.buildPrefixesFromFullPaths(columnNames);

            // assert
            // TO DO: Currently these override each other and end up mapping to the same thing. Should they?
            expect(actualPrefixMap.get("Well.ID")).to.equal("Well.ID");
        });

        it("makes appropriate prefixes for similarly-named columns at different levels of nesting", () => {
            // arrange
            const overlappingNames = [
                ["Cell line"],
                ["Color"], // must be co~ at this level
                ["Material", "Color"], // but can be just c~ at this level
                ["Material", "Shape"],
            ];

            // act
            const actualPrefixMap = ColumnCoder.buildPrefixesFromFullPaths(overlappingNames);

            // assert
            expect(actualPrefixMap.get("Color")).to.equal("co~");
            expect(actualPrefixMap.get("Material.Color")).to.equal("m~.c~");
        });
    });

    describe("buildColumnPrefixes", () => {
        it("returns the smallest possible uniquely identifiable prefixes", () => {
            // arrange
            const columnNames = [
                "Gene",
                "Cell line",
                "Cas9",
                "Solution index",
                "Solution concentration",
            ];
            const expectedPrefixes = ["g", "ce", "ca", "solution i", "solution c"];

            // act
            const actualPrefixMap = ColumnCoder.buildColumnPrefixes(columnNames);

            // assert
            expect(actualPrefixMap.size).to.equal(expectedPrefixes.length);
            expectedPrefixes.forEach((prefix) => {
                expect([...actualPrefixMap.values()].some((p) => p === `${prefix}${PREFIX_MARKER}`))
                    .to.be.true;
            });
        });

        it("uses the full non-normalized name when the whole string is a prefix for another name", () => {
            // arrange
            const columnNames = [
                "Solution Index",
                "Solution Concentration",
                "Solution Concentration Units",
            ];

            // act
            const actualPrefixMap = ColumnCoder.buildColumnPrefixes(columnNames);

            // assert
            expect(actualPrefixMap.get("Solution Concentration")).to.equal(
                "Solution Concentration"
            ); // not normalized, no character indicator, upper case
            expect(actualPrefixMap.get("Solution Concentration Units")).to.equal(
                "solution concentration u~"
            ); // normalized, has `~`, lower case
        });

        it("uses the full non-normalized name if the prefix would be the same length", () => {
            // arrange
            const columnNames = ["Ab", "C", "Def"];

            // act
            const actualPrefixMap = ColumnCoder.buildColumnPrefixes(columnNames);

            // assert
            expect(actualPrefixMap.get("Ab")).to.equal("Ab");
            expect(actualPrefixMap.get("C")).to.equal("C");
            expect(actualPrefixMap.get("Def")).to.equal("d~"); // not using full name
        });

        it("avoids ending on a whitespace character", () => {
            // arrange
            const columnNames = ["Cell", "Cell Line"];

            // act
            const actualPrefixMap = ColumnCoder.buildColumnPrefixes(columnNames);

            // assert
            // otherwise, would count the space as a unique string segment and return "cell ~"
            expect(actualPrefixMap.get("Cell Line")).to.equal("cell l~");
        });
    });

    describe("createPrefixResolver", () => {
        const mockAnnotationPaths = [
            ["Gene"],
            ["Cell line"],
            ["Cas9"],
            ["Solution Index"],
            ["Solution Concentration"],
            ["Solution Concentration Units"],
        ];

        it("resolves to regular annotation paths", () => {
            const prefixResolver = ColumnCoder.createPrefixResolver(mockAnnotationPaths);

            expect(prefixResolver("g~")).to.equal("Gene");
            expect(prefixResolver("ce~")).to.equal("Cell line");
            expect(prefixResolver("Solution Concentration")).to.equal("Solution Concentration");
            expect(prefixResolver("solution concentration u~")).to.equal(
                "Solution Concentration Units"
            );
        });

        it("resolves correctly when columns are already using full names instead of prefixes", () => {
            const prefixResolver = ColumnCoder.createPrefixResolver(mockAnnotationPaths);

            expect(prefixResolver("Gene")).to.equal("Gene");
            expect(prefixResolver("Cell line")).to.equal("Cell line");
            expect(prefixResolver("Solution Concentration")).to.equal("Solution Concentration");
            expect(prefixResolver("Solution Concentration Units")).to.equal(
                "Solution Concentration Units"
            );
        });

        it("resolves to nested annotation paths", () => {
            const mockNestedAnnotationPaths = [
                ["Well", "Dose", "Color"],
                ["Well", "Dose", "Concentration"],
                ["Well", "Description"],
                ["Well", "ID"],
                ["Whatever", "Else"],
            ];

            const prefixResolver = ColumnCoder.createPrefixResolver(mockNestedAnnotationPaths);

            expect(prefixResolver("we~.de~")).to.equal("Well.Description");
            expect(prefixResolver("we~.do~.con~")).to.equal("Well.Dose.Concentration");
            expect(prefixResolver("we~.ID")).to.equal("Well.ID");
            // Resolves a nested path that isn't using prefixes
            expect(prefixResolver("Whatever.Else")).to.equal("Whatever.Else");
        });

        it("returns undefined if no matches exist", () => {
            const prefixResolver = ColumnCoder.createPrefixResolver(mockAnnotationPaths);
            expect(prefixResolver("abc~")).to.be.undefined;
        });

        it("returns undefined if multiple ambiguous matches exist", () => {
            const prefixResolver = ColumnCoder.createPrefixResolver(mockAnnotationPaths);
            expect(prefixResolver("solution~")).to.be.undefined; // could be Solution Index, Solution Concentration, etc.
        });
    });
});
