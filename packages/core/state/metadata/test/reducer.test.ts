import { expect } from "chai";

import { receiveAnnotations } from "../actions";
import reducer, { initialState } from "../reducer";
import { changeDataSources } from "../../selection/actions";
import Annotation from "../../../entity/Annotation";
import { AnnotationType } from "../../../entity/AnnotationFormatter";

describe("Metadata reducer", () => {
    const annotation = new Annotation({
        annotationName: "Cell Line",
        description: "",
        type: AnnotationType.STRING,
    });

    describe("CHANGE_DATA_SOURCES", () => {
        it("clears annotations so they cannot be read as the new source's schema", () => {
            const loaded = reducer(initialState, receiveAnnotations([annotation]));
            expect(loaded.annotations).to.have.lengthOf(1);

            const state = reducer(loaded, changeDataSources([]));
            expect(state.annotations).to.be.empty;
        });
    });

    describe("RECEIVE_ANNOTATIONS", () => {
        it("populates annotations for the new source", () => {
            // Arrange
            // (sanity-check) check if annotations are empty first
            expect(initialState.annotations).to.be.empty;

            // Act
            const state = reducer(initialState, receiveAnnotations([annotation]));

            // Assert
            expect(state.annotations).to.deep.equal([annotation]);
        });
    });
});
