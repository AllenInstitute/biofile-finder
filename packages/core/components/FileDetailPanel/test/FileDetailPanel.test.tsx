import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import { uniqueId } from "lodash";
import * as React from "react";
import { Provider } from "react-redux";
import { createSandbox } from "sinon";

import { Environment } from "../../../constants";
import FileDetail from "../../../entity/FileDetail";
import * as useFileDetails from "../../FileDetailPanel/useFileDetails";
import { FmsFileAnnotation } from "../../../services/FileService";
import { initialState } from "../../../state";

import FileDetailPanel from "..";

const mockFileDetail = (annotations: FmsFileAnnotation[] = []) =>
    new FileDetail(
        {
            annotations,
            file_path: uniqueId() + ".txt",
            file_id: uniqueId(),
            file_name: "MyFile.txt",
            file_size: 7,
            uploaded: "01/01/01",
        },
        Environment.TEST
    );

describe("<FileDetailPanel />", () => {
    const sandbox = createSandbox();

    afterEach(() => {
        sandbox.restore();
    });

    it("renders selected file when no provenance origin present", () => {
        // Arrange
        const expectedFileDetail = mockFileDetail();
        const { store } = configureMockStore({
            state: mergeState(initialState, {
                interaction: {
                    originForProvenance: undefined,
                    fileForDetailPanel: mockFileDetail(),
                },
            }),
        });
        sandbox.stub(useFileDetails, "default").returns([expectedFileDetail, false]);

        // Act
        const { queryByText } = render(
            <Provider store={store}>
                <FileDetailPanel />
            </Provider>
        );

        // Assert
        expect(queryByText(expectedFileDetail.name)).to.exist;
    });

    it("renders file from provenance selection when origin present", () => {
        // Arrange
        const expectedFileDetail = mockFileDetail();
        const { store } = configureMockStore({
            state: mergeState(initialState, {
                interaction: {
                    originForProvenance: mockFileDetail(),
                    fileForDetailPanel: expectedFileDetail,
                },
            }),
        });
        sandbox.stub(useFileDetails, "default").returns([mockFileDetail(), false]);

        // Act
        const { queryByText } = render(
            <Provider store={store}>
                <FileDetailPanel />
            </Provider>
        );

        // Assert
        expect(queryByText(expectedFileDetail.name)).to.exist;
    });

    it("hides when origin present but no selected provenance file", () => {
        // Arrange
        const originForProvenance = mockFileDetail();
        const file = mockFileDetail();
        const { store } = configureMockStore({
            state: mergeState(initialState, {
                interaction: {
                    originForProvenance,
                    fileForDetailPanel: undefined,
                },
            }),
        });
        sandbox.stub(useFileDetails, "default").returns([file, false]);

        // Act
        const { queryByText } = render(
            <Provider store={store}>
                <FileDetailPanel />
            </Provider>
        );

        // Assert
        expect(queryByText(file.name)).to.not.exist;
        expect(queryByText(originForProvenance.name)).to.not.exist;
    });
});
