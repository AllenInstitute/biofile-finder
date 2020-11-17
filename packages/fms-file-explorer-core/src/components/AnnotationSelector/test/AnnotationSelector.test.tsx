import { configureMockStore } from "@aics/redux-utils";
import { render, fireEvent } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import AnnotationSelector from "..";
import { initialState } from "../../../state";

describe("<AnnotationSelector />", () => {
    it("selects all columns when 'Select All' button is clicked", async () => {
        // Arrange
        const initialAnnotations = ["Cell Line", "Cas9"];
        const annotationOptions = ["Cell Line", "Cas9", "File Id", "Donor Plasmid"];
        let actualAnnotations;
        const setAnnotations = (annotations: string[]) => {
            actualAnnotations = annotations;
        };
        const { store } = configureMockStore({ state: initialState });
        const { findByText } = render(
            <Provider store={store}>
                <AnnotationSelector
                    annotations={initialAnnotations}
                    annotationOptions={annotationOptions}
                    setAnnotations={setAnnotations}
                />
            </Provider>
        );

        // Act
        const selectAllButton = await findByText("Select All");
        fireEvent.click(selectAllButton);

        // Assert
        expect(actualAnnotations).to.be.deep.equal(annotationOptions);
    });

    it("deselects all columns when 'Select None' button is clicked", async () => {
        // Arrange
        const initialAnnotations = ["Cell Line", "Cas9", "File Id"];
        const annotationOptions = ["Cell Line", "Cas9", "File Id", "Donor Plasmid"];
        let actualAnnotations;
        const setAnnotations = (annotations: string[]) => {
            actualAnnotations = annotations;
        };
        const { store } = configureMockStore({ state: initialState });
        const { findByText, findAllByRole } = render(
            <Provider store={store}>
                <AnnotationSelector
                    annotations={initialAnnotations}
                    annotationOptions={annotationOptions}
                    setAnnotations={setAnnotations}
                />
            </Provider>
        );
        // (sanity-check) ensure columns are present in list before asserting that they are removed
        const annotationItems = await findAllByRole("listitem");
        expect(annotationItems).to.be.length(initialAnnotations.length);

        // Act
        const selectNoneButton = await findByText("Select None");
        fireEvent.click(selectNoneButton);

        // Assert
        expect(actualAnnotations).to.be.empty;
    });

    describe("column list", () => {
        it("removes column when icon is clicked", async () => {
            // Arrange
            const annotation = "Cell Line";
            const initialAnnotations = [annotation];
            const annotationOptions = [annotation, "Cas9", "File Id", "Donor Plasmid"];
            let actualAnnotations;
            const setAnnotations = (annotations: string[]) => {
                actualAnnotations = annotations;
            };
            const { store } = configureMockStore({ state: initialState });
            const { findByTestId, findAllByRole } = render(
                <Provider store={store}>
                    <AnnotationSelector
                        annotations={initialAnnotations}
                        annotationOptions={annotationOptions}
                        setAnnotations={setAnnotations}
                    />
                </Provider>
            );
            // (sanity-check) ensure column is present in list before asserting that it was removed
            const annotationItems = await findAllByRole("listitem");
            expect(annotationItems).to.be.length(initialAnnotations.length);

            // Act
            const deselectIcon = await findByTestId("column-deselect-icon");
            fireEvent.click(deselectIcon);

            // Assert
            expect(actualAnnotations).to.be.empty;
        });

        it("adds column to list when selected in dropdown", async () => {
            // Arrange
            const annotation = "File Id";
            const initialAnnotations = ["Cas9", "Cell Line"];
            const expectedAnnotations = ["Cas9", "Cell Line", annotation];
            const annotationOptions = ["Cas9", "Cell Line", "Donor Plasmid", annotation];
            let actualAnnotations;
            const setAnnotations = (annotations: string[]) => {
                actualAnnotations = annotations;
            };
            const { store } = configureMockStore({ state: initialState });
            const { findByText, findAllByRole } = render(
                <Provider store={store}>
                    <AnnotationSelector
                        annotations={initialAnnotations}
                        annotationOptions={annotationOptions}
                        setAnnotations={setAnnotations}
                    />
                </Provider>
            );
            // (sanity-check) ensure column is not present in list before asserting that it was added
            const annotationItems = await findAllByRole("listitem");
            expect(annotationItems).to.be.length(initialAnnotations.length);

            // Act
            const dropdown = await findByText(initialAnnotations.join(", "));
            fireEvent.click(dropdown);
            const dropdownOption = await findByText(annotation);
            fireEvent.click(dropdownOption);

            // Assert
            expect(actualAnnotations).to.be.deep.equal(expectedAnnotations);
        });
    });
});
