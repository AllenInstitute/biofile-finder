import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";
import { createSandbox } from "sinon";

import ProcessFiles from "../ProcessFilesCodeSnippetModal";
import { initialState, interaction, selection } from "../../../../state";

describe("<ProcessFiles />", () => {
    const sandbox = createSandbox();

    afterEach(() => {
        sandbox.restore();
    });

    it("renders with Setup and Code sections", () => {
        sandbox.stub(selection.selectors, "getFileSelection").returns({
            fetchAllDetails: async () => [],
        } as any);

        const state = mergeState(initialState, {});
        const { store } = configureMockStore({ state });

        const { getByText } = render(
            <Provider store={store}>
                <ProcessFiles onDismiss={() => undefined} />
            </Provider>
        );

        expect(getByText("Setup")).to.exist;
        expect(getByText("Code")).to.exist;
    });

    it("dispatches a snippet whose setup includes the inferred plugin deps", async () => {
        sandbox.stub(selection.selectors, "getFileSelection").returns({
            fetchAllDetails: async () => [
                { path: "/data/a/sample_a.ome.tiff" }, // -> bioio-ome-tiff
                { path: "/data/c/sample_c.lif" }, // -> bioio-lif
                { path: "/data/d/notes.txt" }, // ignored
            ],
        } as any);

        const { store, actions, logicMiddleware } = configureMockStore({ state: initialState });

        render(
            <Provider store={store}>
                <ProcessFiles onDismiss={() => undefined} />
            </Provider>
        );

        await logicMiddleware.whenComplete();

        expect(
            actions.includesMatch({
                type: interaction.actions.SET_PROCESS_FILES_PYTHON_SNIPPET,
            }),
            "expected SET_PROCESS_FILES_PYTHON_SNIPPET to be dispatched"
        ).to.be.true;

        const action = actions.list.find(
            (a) => a.type === interaction.actions.SET_PROCESS_FILES_PYTHON_SNIPPET
        );
        expect(action, "expected to capture the snippet action payload").to.exist;

        const setup: string = action!.payload?.setup ?? "";
        expect(setup).to.match(/pip install\s+bioio\s+pandas/i);
        expect(setup).to.include("bioio-lif");
        expect(setup).to.include("bioio-ome-tiff");
        expect(setup).to.not.include("bioio-czi");
        expect(setup).to.not.include("bioio-ome-zarr");
    });
});
