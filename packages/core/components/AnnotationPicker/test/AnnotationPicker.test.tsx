import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import { noop } from "lodash";
import * as React from "react";
import { Provider } from "react-redux";

import AnnotationPicker from "..";
import Annotation from "../../../entity/Annotation";
import { AnnotationType } from "../../../entity/AnnotationFormatter";
import { initialState } from "../../../state";

describe("<AnnotationPicker />", () => {
    it("treats nested annotations with the same leaf name as distinct options", () => {
        // Arrange
        const wellUnit = new Annotation({
            annotationName: ["Well", "Dose", "Unit"],
            description: "Well dose unit",
            type: AnnotationType.STRING,
        });
        const mediaUnit = new Annotation({
            annotationName: ["Media", "Unit"],
            description: "Media unit",
            type: AnnotationType.STRING,
        });
        const state = mergeState(initialState, {
            metadata: {
                annotations: [wellUnit, mediaUnit],
            },
            selection: {
                availableAnnotationsForHierarchy: [wellUnit.name],
                availableAnnotationsForHierarchyLoading: false,
                recentAnnotations: [wellUnit.name],
            },
        });
        const { store } = configureMockStore({ state });

        // Act
        const { getByTestId } = render(
            <Provider store={store}>
                <AnnotationPicker
                    disableUnavailableAnnotations
                    selections={[]}
                    setSelections={noop}
                />
            </Provider>
        );

        // Assert
        expect(getByTestId(`default-button-${wellUnit.name}`)).to.not.have.property(
            "disabled",
            true
        );
        expect(getByTestId(`default-button-${mediaUnit.name}`)).to.have.property("disabled", true);
    });
});
