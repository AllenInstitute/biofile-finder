import { mergeState } from "@aics/redux-utils";
import { expect } from "chai";

import metadata from "..";
import { initialState } from "../..";
import Annotation from "../../../entity/Annotation";
import { AnnotationType } from "../../../entity/AnnotationFormatter";

describe("Metadata selectors", () => {
    describe("getAnnotationNameToAnnotationMap", () => {
        it("indexes a nested annotation by both its leaf name and its full dotted path", () => {
            // arrange
            const nested = new Annotation({
                path: ["Well", "Dose", "Unit"],
                description: "Dose unit",
                type: AnnotationType.STRING,
            });
            const state = mergeState(initialState, {
                metadata: { annotations: [nested] },
            });

            // act
            const map = metadata.selectors.getAnnotationNameToAnnotationMap(state);

            // assert: reachable by leaf name (for sub-field rows that only know "Unit")
            // and by full path (for unambiguous lookups).
            expect(map.get("Unit")).to.equal(nested);
            expect(map.get("Well.Dose.Unit")).to.equal(nested);
        });

        it("lets a full-path key win over a leaf-name collision", () => {
            // arrange: a flat annotation named "Unit" collides with the nested leaf "Unit".
            const flatUnit = new Annotation({
                path: ["Unit"],
                description: "Flat unit column",
                type: AnnotationType.STRING,
            });
            const nestedUnit = new Annotation({
                path: ["Well", "Dose", "Unit"],
                description: "Dose unit",
                type: AnnotationType.STRING,
            });
            const state = mergeState(initialState, {
                metadata: { annotations: [flatUnit, nestedUnit] },
            });

            // act
            const map = metadata.selectors.getAnnotationNameToAnnotationMap(state);

            // assert: the full-path key resolves to the nested annotation, while the bare
            // "Unit" name resolves to the flat one (its own full path is also "Unit").
            expect(map.get("Well.Dose.Unit")).to.equal(nestedUnit);
            expect(map.get("Unit")).to.equal(flatUnit);
        });
    });
});
