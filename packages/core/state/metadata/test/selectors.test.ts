import { mergeState } from "@aics/redux-utils";
import { expect } from "chai";

import metadata from "..";
import { initialState } from "../..";
import Annotation from "../../../entity/Annotation";
import { AnnotationType } from "../../../entity/AnnotationFormatter";

describe("Metadata selectors", () => {
    describe("getAnnotationNameToAnnotationMap", () => {
        it("indexes a nested annotation by its full dotted path", () => {
            // arrange
            const nested = new Annotation({
                annotationName: ["Well", "Dose", "Unit"],
                description: "Dose unit",
                type: AnnotationType.STRING,
                pathIsArray: [true, false, false],
            });
            const state = mergeState(initialState, {
                metadata: { annotations: [nested] },
            });

            // act
            const map = metadata.selectors.getAnnotationNameToAnnotationMap(state);

            // assert: reachable by full path name not leaf name
            expect(map.get("Well.Dose.Unit")).to.equal(nested);
            expect(map.get("Well")).to.be.undefined;
            expect(map.get("Dose")).to.be.undefined;
            expect(map.get("Unit")).to.be.undefined;
        });

        it("indexes a simple annotation by its full name", () => {
            // arrange
            const simple = new Annotation({
                annotationName: ["Unit"],
                description: "Simple unit column",
                type: AnnotationType.STRING,
            });
            const state = mergeState(initialState, {
                metadata: { annotations: [simple] },
            });

            // act
            const map = metadata.selectors.getAnnotationNameToAnnotationMap(state);

            // assert: reachable by just name
            expect(map.get("Unit")).to.equal(simple);
        });
    });
});
