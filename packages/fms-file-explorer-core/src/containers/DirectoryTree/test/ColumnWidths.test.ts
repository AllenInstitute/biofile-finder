import { expect } from "chai";

import Cell from "../../../components/FileRow/Cell";
import { ColumnWidths } from "../useResizableColumns";

describe("ColumnWidths", () => {
    const COLUMNS = ["itchy", "scratchy"];

    it("maintains proportionality as the row gets wider", () => {
        const ORIGINAL_ROW_WIDTH = 500;
        const ORIGINAL_COLUMN_WIDTH = 100;
        const NEW_ROW_WIDTH = 1000;
        const NEW_EXPECTED_COLUMN_WIDTH = 200;

        const columnWidths = new ColumnWidths(ORIGINAL_ROW_WIDTH, COLUMNS);
        columnWidths.set("itchy", ORIGINAL_COLUMN_WIDTH);

        // before
        expect(columnWidths.get("itchy")).to.equal(ORIGINAL_COLUMN_WIDTH);

        // update row width and test proportionality
        columnWidths.setRowWidth(NEW_ROW_WIDTH);
        expect(columnWidths.get("itchy")).to.equal(NEW_EXPECTED_COLUMN_WIDTH);
    });

    it("maintains proportionality as the row gets narrower", () => {
        const ORIGINAL_ROW_WIDTH = 1000;
        const ORIGINAL_COLUMN_WIDTH = 200;
        const NEW_ROW_WIDTH = 500;
        const NEW_EXPECTED_COLUMN_WIDTH = 100;

        const columnWidths = new ColumnWidths(ORIGINAL_ROW_WIDTH, COLUMNS);
        columnWidths.set("itchy", ORIGINAL_COLUMN_WIDTH);

        // before
        expect(columnWidths.get("itchy")).to.equal(ORIGINAL_COLUMN_WIDTH);

        // update row width and test proportionality
        columnWidths.setRowWidth(NEW_ROW_WIDTH);
        expect(columnWidths.get("itchy")).to.equal(NEW_EXPECTED_COLUMN_WIDTH);
    });

    it("updates the default width as the number of columns changes", () => {
        const ORIGINAL_COLUMN_WIDTH = 300;
        const NEW_EXPECTED_COLUMN_WIDTH = 200;

        const columnWidths = new ColumnWidths(600, COLUMNS);

        // before
        expect(columnWidths.get("itchy")).to.equal(ORIGINAL_COLUMN_WIDTH);

        // update row width and test proportionality
        columnWidths.setColumns([...COLUMNS, "poochie"]);
        expect(columnWidths.get("itchy")).to.equal(NEW_EXPECTED_COLUMN_WIDTH);
    });

    it("updates the default width as the row changes width", () => {
        const ORIGINAL_ROW_WIDTH = 1000;
        const ORIGINAL_COLUMN_WIDTH = 500;
        const NEW_ROW_WIDTH = 500;
        const NEW_EXPECTED_COLUMN_WIDTH = 250;

        const columnWidths = new ColumnWidths(ORIGINAL_ROW_WIDTH, COLUMNS);

        // before
        expect(columnWidths.get("itchy")).to.equal(ORIGINAL_COLUMN_WIDTH);

        // update row width and test proportionality
        columnWidths.setRowWidth(NEW_ROW_WIDTH);
        expect(columnWidths.get("itchy")).to.equal(NEW_EXPECTED_COLUMN_WIDTH);
    });

    it("returns a minimum value for a column width", () => {
        const columnWidths = new ColumnWidths(100, COLUMNS);
        columnWidths.set("itchy", Cell.MINIMUM_WIDTH - 1);

        expect(columnWidths.get("itchy")).to.equal(Cell.MINIMUM_WIDTH);
    });

    it("returns a default value for a column width if one has not been explicitly set", () => {
        const columnWidths = new ColumnWidths(100, COLUMNS);
        COLUMNS.forEach((column) => {
            expect(columnWidths.get(column)).to.be.a("number");
        });
    });

    it("returns an accumulation of the column widths", () => {
        const rowWidth = 100;
        const columnWidths = new ColumnWidths(rowWidth, COLUMNS);

        expect(columnWidths.getAccumulatedColumnWidths()).to.equal(rowWidth);
    });

    it("resets the width for a column to the default width", () => {
        const columnWidths = new ColumnWidths(100, COLUMNS);
        const defaultWidth = columnWidths.get("itchy");

        // set it to something else
        columnWidths.set("itchy", 500);
        const expandedWidth = columnWidths.get("itchy");

        columnWidths.reset("itchy");

        expect(columnWidths.get("itchy"))
            .to.equal(defaultWidth)
            .and.to.not.equal(expandedWidth);
    });
});
