import { configureMockStore, mergeState } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import Annotation from "../../../entity/Annotation";
import { AnnotationType } from "../../../entity/AnnotationFormatter";
import { initialState, selection } from "../../../state";

import ColumnPicker from "../ColumnPicker";

describe("<ColumnPicker />", () => {
    const cellLine = new Annotation({
        annotationName: "Cell Line",
        description: "Cell line",
        type: AnnotationType.STRING,
    });
    const gene = new Annotation({
        annotationName: "Gene",
        description: "Gene",
        type: AnnotationType.STRING,
    });

    function renderColumnPicker(columnNames: string[]) {
        const state = mergeState(initialState, {
            metadata: { annotations: [cellLine, gene] },
            selection: { columns: columnNames.map((name) => ({ name, width: 150 })) },
        });
        const { actions, store } = configureMockStore({ state });
        return {
            actions,
            ...render(
                <Provider store={store}>
                    <ColumnPicker />
                </Provider>
            ),
        };
    }

    it("displays the columns currently in the file list as selected", () => {
        // Arrange / Act
        const { getByTestId } = renderColumnPicker([cellLine.name]);

        // Assert
        expect(getByTestId(`default-button-${cellLine.name}`).textContent).to.contain(
            cellLine.displayName
        );
        expect(getByTestId(`default-button-${gene.name}`)).to.exist;
    });

    it("selects an annotation that is not yet displayed as a column", () => {
        // Arrange
        const { actions, getByTestId } = renderColumnPicker([cellLine.name]);

        // Act
        fireEvent.click(getByTestId(`default-button-${gene.name}`));

        // Assert
        expect(actions.includesMatch(selection.actions.selectColumns([cellLine.name, gene.name])))
            .to.be.true;
    });

    it("deselects an annotation that is displayed as a column", () => {
        // Arrange
        const { actions, getByTestId } = renderColumnPicker([cellLine.name, gene.name]);

        // Act
        fireEvent.click(getByTestId(`default-button-${gene.name}`));

        // Assert
        expect(actions.includesMatch(selection.actions.selectColumns([cellLine.name]))).to.be.true;
    });
});
