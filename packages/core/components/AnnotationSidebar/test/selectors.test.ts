import { expect } from "chai";
import { isArray, map, mergeWith } from "lodash";

import Annotation from "../../../entity/Annotation";
import { annotationsJson } from "../../../entity/Annotation/mocks";
import * as annotationSelectors from "../selectors";
import { initialState } from "../../../state";
import FileFilter from "../../../entity/FileFilter";

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

            const first = listItems[0]; // items are sorted according to Annotation::sort
            expect(first).to.have.property("id");
            expect(first).to.have.property("description", "AICS cell line");
            expect(first).to.have.property("title", "Cell line");
        });

        it("denotes filtered annotations as filtered", () => {
            const filters = [
                new FileFilter("Cell Line", "AICS-0"),
                new FileFilter("Date Created", "01/10/15"),
            ];
            const state = mergeState(initialState, {
                metadata: {
                    annotations: map(annotationsJson, (annotation) => new Annotation(annotation)),
                },
                selection: {
                    filters,
                },
            });

            const listItems = annotationSelectors.getAnnotationListItems(state);
            expect(listItems.length).to.equal(annotationsJson.length);

            listItems.forEach((item) => {
                const filtered = filters.findIndex((f) => f.name === item.id) !== -1;
                expect(item).to.have.property("filtered", filtered);
            });
        });

        it("denotes non-available annotations as disabled", () => {
            const annotations = map(annotationsJson, (annotation) => new Annotation(annotation));
            const availableAnnotationsForHierarchy = annotations.slice(1, 3).map((a) => a.name);
            const availableAnnotationsForHierarchySet = new Set(availableAnnotationsForHierarchy);
            const state = mergeState(initialState, {
                metadata: {
                    annotations,
                },
                selection: {
                    availableAnnotationsForHierarchy,
                    annotationHierarchy: annotations.slice(1, 2),
                },
            });

            const listItems = annotationSelectors.getAnnotationListItems(state);
            expect(listItems.length).to.equal(annotationsJson.length);

            listItems.forEach((item) => {
                const disabled = !availableAnnotationsForHierarchySet.has(item.id);
                expect(item).to.have.property("disabled", disabled);
            });
        });

        it("denotes all annotations as enabled when hierarchy is empty", () => {
            const annotations = map(annotationsJson, (annotation) => new Annotation(annotation));
            const availableAnnotationsForHierarchy = annotations.slice(1, 3).map((a) => a.name);
            const state = mergeState(initialState, {
                metadata: {
                    annotations,
                },
                selection: {
                    availableAnnotationsForHierarchy,
                },
            });

            const listItems = annotationSelectors.getAnnotationListItems(state);
            expect(listItems.length).to.equal(annotationsJson.length);

            listItems.forEach((item) => {
                expect(item).to.have.property("disabled", false);
            });
        });
    });
});
