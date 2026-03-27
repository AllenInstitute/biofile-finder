import { expect } from "chai";

import Annotation from "../../../entity/Annotation";
import { AnnotationType } from "../../../entity/AnnotationFormatter";
import FileFilter, { FilterType } from "../../../entity/FileFilter";
import FileSort, { SortOrder } from "../../../entity/FileSort";
import { parseNaturalLanguageQuery } from "../naturalLanguage";

describe("parseNaturalLanguageQuery", () => {
    const annotations = [
        new Annotation({
            annotationDisplayName: "Cell Line",
            annotationName: "cell_line",
            description: "",
            type: AnnotationType.STRING,
        }),
        new Annotation({
            annotationDisplayName: "Donor Plasmid",
            annotationName: "donor_plasmid",
            description: "",
            type: AnnotationType.STRING,
        }),
        new Annotation({
            annotationDisplayName: "Uploaded",
            annotationName: "uploaded",
            description: "",
            type: AnnotationType.DATETIME,
        }),
        new Annotation({
            annotationDisplayName: "Cell Type Classification",
            annotationName: "cell_type_classification",
            description: "",
            type: AnnotationType.STRING,
        }),
    ];

    it("parses explicit grouping, filtering, and sorting instructions", () => {
        const result = parseNaturalLanguageQuery(
            "group by cell line and donor plasmid, donor plasmid ACTB-mEGFP, sort by uploaded descending",
            {
                annotations,
                annotationValuesByName: {
                    donor_plasmid: ["ACTB-mEGFP"],
                },
            }
        );

        expect(result.touchedHierarchy).to.equal(true);
        expect(result.hierarchy).to.deep.equal(["cell_line", "donor_plasmid"]);
        expect(result.touchedFilters).to.equal(true);
        expect(result.filters.map((filter) => filter.toJSON())).to.deep.equal([
            new FileFilter("donor_plasmid", "ACTB-mEGFP").toJSON(),
        ]);
        expect(result.touchedSort).to.equal(true);
        expect(result.sortColumn?.equals(new FileSort("uploaded", SortOrder.DESC))).to.equal(true);
    });

    it("infers unique shared annotation values without an explicit annotation name", () => {
        const result = parseNaturalLanguageQuery("show ACTB-mEGFP files", {
            annotations,
            annotationValuesByName: {
                donor_plasmid: ["ACTB-mEGFP", "LMNB1-mTagBFP2"],
                cell_line: ["AICS-13"],
            },
        });

        expect(result.touchedFilters).to.equal(true);
        expect(result.filters.map((filter) => filter.toJSON())).to.deep.equal([
            new FileFilter("donor_plasmid", "ACTB-mEGFP").toJSON(),
        ]);
    });

    it("parses any-value and no-value filter instructions", () => {
        const result = parseNaturalLanguageQuery(
            "with any value for donor plasmid and cell line no value",
            { annotations }
        );

        expect(result.filters.map((filter) => filter.toJSON())).to.deep.equal([
            new FileFilter("donor_plasmid", "", FilterType.ANY).toJSON(),
            new FileFilter("cell_line", "", FilterType.EXCLUDE).toJSON(),
        ]);
    });

    it("matches a unique partial annotation name for grouping", () => {
        const result = parseNaturalLanguageQuery("group by cell type", { annotations });

        expect(result.touchedHierarchy).to.equal(true);
        expect(result.hierarchy).to.deep.equal(["cell_type_classification"]);
    });

    it("returns ambiguity details when a phrase matches multiple annotations", () => {
        const result = parseNaturalLanguageQuery("group by cell", { annotations });

        expect(result.ambiguities).to.have.length(1);
        expect(result.ambiguities[0].phrase).to.equal("cell");
        expect(result.ambiguities[0].matches.map((annotation) => annotation.name)).to.deep.equal([
            "cell_line",
            "cell_type_classification",
        ]);
    });

    it("applies a selected disambiguation override", () => {
        const result = parseNaturalLanguageQuery("group by cell", {
            annotations,
            resolvedAnnotationsByPhrase: {
                cell: "cell_line",
            },
        });

        expect(result.ambiguities).to.deep.equal([]);
        expect(result.hierarchy).to.deep.equal(["cell_line"]);
    });

    it("prefers currently available annotations when several names partially match", () => {
        const result = parseNaturalLanguageQuery("group by cell", {
            annotations,
            availableAnnotationNames: ["cell_type_classification"],
        });

        expect(result.ambiguities).to.deep.equal([]);
        expect(result.hierarchy).to.deep.equal(["cell_type_classification"]);
    });

    it("parses a date range filter for uploaded since a specific day", () => {
        const result = parseNaturalLanguageQuery("files uploaded since 2026-01-01", {
            annotations,
        });

        expect(result.filters).to.have.length(1);
        expect(result.filters[0].name).to.equal("uploaded");
        expect(result.filters[0].value).to.match(/^RANGE\(2026-01-01T00:00:00.000Z,[\d\-:T.]+Z\)$/);
    });
});
