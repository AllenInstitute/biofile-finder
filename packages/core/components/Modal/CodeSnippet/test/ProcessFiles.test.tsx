import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render, waitFor } from "@testing-library/react";
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

        const state = mergeState(initialState, {});
        const { store } = configureMockStore({ state });
        const origDispatch = store.dispatch;
        const dispatchSpy = sandbox.spy((action: any) => origDispatch(action));
        (store as any).dispatch = dispatchSpy;

        render(
            <Provider store={store}>
                <ProcessFiles onDismiss={() => undefined} />
            </Provider>
        );

        await waitFor(() => {
            expect(
                dispatchSpy.calledWithMatch({
                    type: interaction.actions.SET_PROCESS_FILES_PYTHON_SNIPPET,
                }),
                "expected SET_PROCESS_FILES_PYTHON_SNIPPET to be dispatched"
            ).to.be.true;

            const call = dispatchSpy.getCalls().find((c) => {
                const a = c.args[0];
                return a?.type === interaction.actions.SET_PROCESS_FILES_PYTHON_SNIPPET;
            });

            if (!call) {
                throw new Error("expected to capture the snippet action payload");
            }

            const setup: string = call.args[0]?.payload?.setup ?? "";
            expect(setup).to.match(/pip install\s+bioio\s+pandas/i);
            expect(setup).to.include("bioio-lif");
            expect(setup).to.include("bioio-ome-tiff");
            expect(setup).to.not.include("bioio-czi");
            expect(setup).to.not.include("bioio-ome-zarr");
        });
    });
});
