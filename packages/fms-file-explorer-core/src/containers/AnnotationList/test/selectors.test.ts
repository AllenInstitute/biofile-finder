import { expect } from "chai";
import { isArray, map, mergeWith } from "lodash";

import Annotation from "../../../entity/Annotation";
import { annotationsJson } from "./mocks";
import * as annotationListSelectors from "../selectors";
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

describe("AnnotationList selectors", () => {
    describe("getAnnotationListItems", () => {
        it("transforms available annotations into list item data", () => {
            const state = mergeState(initialState, {
                metadata: {
                    annotations: map(annotationsJson, (annotation) => new Annotation(annotation)),
                },
            });

            const listItems = annotationListSelectors.getAnnotationListItems(state);
            expect(listItems.length).to.equal(annotationsJson.length);

            const first = listItems[0];
            expect(first).to.have.property("id");
            expect(first).to.have.property("value", "Date created");
        });
    });
});
