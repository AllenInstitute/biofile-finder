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
                    annotations: map(
                        annotationsJson,
                        (annotation) => new Annotation(annotation, annotation["values"])
                    ),
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

    describe("getNonAvailableAnnotationsForHierarchy", () => {
        it("filters annotation list items to exclude available annotations", () => {
            const state = mergeState(initialState, {
                metadata: {
                    annotations: map(
                        annotationsJson,
                        (annotation) => new Annotation(annotation, annotation["values"])
                    ),
                },
                selection: {
                    annotationHierarchy: [
                        new Annotation(
                            {
                                annotationName: "color",
                                annotationDisplayName: "Color",
                                description: "a color",
                                type: "text",
                            },
                            ["blue"]
                        ),
                    ],
                    availableAnnotationsForHierarchy: ["date_created", "cell_dead"],
                },
            });

            const listItems = annotationSelectors.getNonAvailableAnnotationsForHierarchy(state);
            expect(listItems.length).to.equal(annotationsJson.length - 2);
        });

        it("considers all annotations viable when no hierarchy is present", () => {
            const state = mergeState(initialState, {
                metadata: {
                    annotations: map(
                        annotationsJson,
                        (annotation) => new Annotation(annotation, annotation["values"])
                    ),
                },
                selection: {
                    annotationHierarchy: [],
                    availableAnnotationsForHierarchy: ["date_created", "cell_dead"],
                },
            });

            const listItems = annotationSelectors.getNonAvailableAnnotationsForHierarchy(state);
            expect(listItems).to.be.empty;
        });
    });
});
