import { configureMockStore, mergeState } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import AnnotationName from "../../../entity/Annotation/AnnotationName";
import FileSort, { SortOrder } from "../../../entity/FileSort";
import { initialState, selection } from "../../../state";
import Header from "../Header";

describe("<Header />", () => {
    it("dispatches sort action when clicked when file attribute", () => {
        // Arrange
        const annotations = [
            AnnotationName.FILE_NAME,
            AnnotationName.KIND,
            AnnotationName.FILE_SIZE,
            AnnotationName.UPLOADED,
        ];
        const state = mergeState(initialState, {
            metadata: {
                annotations: annotations.map((name) => ({
                    name,
                    displayName: name,
                    description: name,
                })),
            },
            selection: {
                columns: annotations.map((name) => ({
                    name: name,
                    width: 1 / annotations.length,
                })),
            },
        });
        const { actions, store } = configureMockStore({ state });
        const { getAllByText } = render(
            <Provider store={store}>
                <Header />
            </Provider>
        );

        // Act
        const fileSizeColumn = getAllByText(AnnotationName.FILE_SIZE)[0];
        fireEvent.click(fileSizeColumn);

        // Assert
        expect(actions.includesMatch(selection.actions.sortColumn(AnnotationName.FILE_SIZE))).to.be
            .true;
    });

    it("renders downward chevron when column is sorted descending", () => {
        // Arrange
        const annotations = [
            AnnotationName.FILE_NAME,
            AnnotationName.KIND,
            AnnotationName.FILE_SIZE,
            AnnotationName.UPLOADED,
        ];
        const state = mergeState(initialState, {
            metadata: {
                annotations: annotations.map((name) => ({
                    name,
                    displayName: name,
                    description: name,
                })),
            },
            selection: {
                columns: annotations.map((name) => ({
                    name: name,
                    width: 1 / annotations.length,
                })),
                sortColumn: new FileSort(AnnotationName.FILE_SIZE, SortOrder.DESC),
            },
        });
        const { store } = configureMockStore({ state });

        // Act
        const { getAllByText } = render(
            <Provider store={store}>
                <Header />
            </Provider>
        );

        // Assert
        const fileSizeCell = getAllByText(AnnotationName.FILE_SIZE)[0];
        fileSizeCell.querySelector("i[data-icon-name='ChevronDown']");
        expect(fileSizeCell).to.exist;
    });

    it("renders upward chevron when column is sorted ascending", () => {
        // Arrange
        const annotations = [
            AnnotationName.FILE_NAME,
            AnnotationName.KIND,
            AnnotationName.FILE_SIZE,
            AnnotationName.UPLOADED,
        ];
        const state = mergeState(initialState, {
            metadata: {
                annotations: annotations.map((name) => ({
                    name,
                    displayName: name,
                    description: name,
                })),
            },
            selection: {
                columns: annotations.map((name) => ({
                    name: name,
                    width: 1 / annotations.length,
                })),
                sortColumn: new FileSort(AnnotationName.FILE_SIZE, SortOrder.ASC),
            },
        });
        const { store } = configureMockStore({ state });

        // Act
        const { getAllByText } = render(
            <Provider store={store}>
                <Header />
            </Provider>
        );

        // Assert
        const fileSizeCell = getAllByText(AnnotationName.FILE_SIZE)[0];
        fileSizeCell.querySelector("i[data-icon-name='ChevronUp']");
        expect(fileSizeCell).to.exist;
    });
});
