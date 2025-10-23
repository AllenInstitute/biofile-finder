import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";
import { createSandbox } from "sinon";

import Modal, { ModalType } from "../..";
import { initialState, interaction, selection } from "../../../../state";

describe("<ConvertToZarr />", () => {
    const sandbox = createSandbox();

    afterEach(() => {
        sandbox.restore();
    });

    const visibleDialogState = mergeState(initialState, {
        interaction: {
            visibleModal: ModalType.ConvertFiles,
        },
    });

    it("dispatches a snippet with DEFAULTS = {} when scenes=All and destination empty", async () => {
        sandbox.stub(selection.selectors, "getFileSelection").returns({
            fetchAllDetails: async () => [
                { path: "/data/a/sample_a.ome.tiff" },
                { path: "/data/b/sample_b.czi" },
            ],
        } as any);

        const { store, actions, logicMiddleware } = configureMockStore({
            state: visibleDialogState,
        });

        render(
            <Provider store={store}>
                <Modal />
            </Provider>
        );

        await waitFor(() => {
            const hit = actions.list.find(
                (a) => a.type === interaction.actions.SET_CONVERT_FILES_SNIPPET
            );
            expect(hit, "SET_CONVERT_FILES_SNIPPET not dispatched").to.exist;
        });

        await logicMiddleware.whenComplete();

        const lastSnippet = [...actions.list]
            .reverse()
            .find((a) => a.type === interaction.actions.SET_CONVERT_FILES_SNIPPET);

        expect(lastSnippet, "expected to capture snippet payload").to.exist;

        const code: string = (lastSnippet && lastSnippet.payload?.code) ?? "";
        expect(code).to.match(/DEFAULTS\s*=\s*\{\s*\}/);
    });

    it('updates to include "scenes": 5 in DEFAULTS when Single scene with index 5', async () => {
        sandbox.stub(selection.selectors, "getFileSelection").returns({
            fetchAllDetails: async () => [
                { path: "/data/a/sample_a.ome.tiff" },
                { path: "/data/b/sample_b.czi" },
            ],
        } as any);

        const { store, actions, logicMiddleware } = configureMockStore({
            state: visibleDialogState,
        });

        const { findByRole } = render(
            <Provider store={store}>
                <Modal />
            </Provider>
        );

        await waitFor(() => {
            const hit = actions.list.find(
                (a) => a.type === interaction.actions.SET_CONVERT_FILES_SNIPPET
            );
            expect(hit).to.exist;
        });
        await logicMiddleware.whenComplete();
        actions.reset();

        const singleSceneRadio = await findByRole("radio", { name: /single scene/i });
        fireEvent.click(singleSceneRadio);

        const sceneIndexInput = await findByRole("spinbutton");
        fireEvent.change(sceneIndexInput, { target: { value: "5" } });
        fireEvent.blur(sceneIndexInput);

        const updated = await waitFor(() => {
            const hit = [...actions.list]
                .reverse()
                .find(
                    (a) =>
                        a.type === interaction.actions.SET_CONVERT_FILES_SNIPPET &&
                        /DEFAULTS\s*=\s*\{[\s\S]*"scenes":\s*5,?[\s\S]*\}/.test(
                            a.payload?.code || ""
                        )
                );
            expect(hit, 'expected an updated snippet with `"scenes": 5`').to.exist;
            return hit as typeof actions.list[number] | undefined;
        });

        expect(updated, "expected updated snippet action").to.exist;

        const code: string = (updated && updated.payload?.code) ?? "";
        expect(code).to.match(/DEFAULTS\s*=\s*\{[\s\S]*"scenes":\s*5,?[\s\S]*\}/);

        const opts = (updated && updated.payload?.options) ?? {};
        expect(opts.scenes).to.equal("5");
    });
});
