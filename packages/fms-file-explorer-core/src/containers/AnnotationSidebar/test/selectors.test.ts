import { expect } from "chai";
import { isArray, map, mergeWith } from "lodash";

import Annotation from "../../../entity/Annotation";
import { annotationsJson } from "../../../entity/Annotation/mocks";
import * as annotationSelectors from "../selectors";
import { initialState } from "../../../state";

type PartialDeep<T> = {
    [P in keyof T]?: PartialDeep<T[P]>;
};

function mergeState<State = {}>(initial: State, src: PartialDeep<State>): State {
    return mergeWith({}, initial, src, (objValue, srcValue) => {
        if (isArray(objValue)) {
            return objValue.concat(srcValue);
        }
    });
}

describe("<AnnotationSidebar /> selectors", () => {
    describe("getAnnotationListItems", () => {
        it("transforms available annotations into list item data", () => {
            const state = mergeState(initialState, {
                metadata: {
                    annotations: map(annotationsJson, (annotation) => new Annotation(annotation)),
                },
            });

            const listItems = annotationSelectors.getAnnotationListItems(state);
            expect(listItems.length).to.equal(annotationsJson.length);

            const first = listItems[0];
            expect(first).to.have.property("id");
            expect(first).to.have.property("description", "Date and time file was created");
            expect(first).to.have.property("title", "Date created");
        });
    });

    describe("getNonCombinableAnnotationsForHierarchy", () => {
        it("filters annotation list items to exclude combinable annotations", () => {
            const state = mergeState(initialState, {
                metadata: {
                    annotations: map(annotationsJson, (annotation) => new Annotation(annotation)),
                },
                selection: {
                    combinableAnnotationsForHierarchy: ["date_created", "cell_dead"],
                },
            });

            const listItems = annotationSelectors.getNonCombinableAnnotationsForHierarchy(state);
            expect(listItems.length).to.equal(annotationsJson.length - 2);

            const first = listItems[0];
            expect(first).to.have.property("id");
            expect(first).to.have.property("description", "AICS cell line");
            expect(first).to.have.property("title", "Cell line");
        });
    });
});
