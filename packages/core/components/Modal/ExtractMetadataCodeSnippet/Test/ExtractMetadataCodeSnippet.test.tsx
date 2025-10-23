import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";
import { createSandbox } from "sinon";

import Modal, { ModalType } from "../..";
import { initialState, interaction, selection } from "../../../../state";

describe("<ExtractMetadata />", () => {
    const sandbox = createSandbox();

    afterEach(() => {
        sandbox.restore();
    });

    const baseVisibleState = mergeState(initialState, {
        interaction: {
            visibleModal: ModalType.ExtractMetadataCodeSnippet,
        },
        selection: {
            dataSources: [{ uri: "fake-uri.test" }],
        },
    });

    it("dispatches a snippet whose Setup includes base deps (bioio, pandas)", async () => {
        sandbox.stub(selection.selectors, "getFileSelection").returns({
            fetchAllDetails: async () => [],
        } as any);

        const { store, actions, logicMiddleware } = configureMockStore({
            state: baseVisibleState,
        });

        render(
            <Provider store={store}>
                <Modal />
            </Provider>
        );

        await logicMiddleware.whenComplete();

        expect(
            actions.includesMatch({
                type: interaction.actions.SET_EXTRACT_METADATA_PYTHON_SNIPPET,
            }),
            "expected SET_EXTRACT_METADATA_PYTHON_SNIPPET to be dispatched"
        ).to.be.true;

        const lastSnippet = [...actions.list]
            .reverse()
            .find((a) => a.type === interaction.actions.SET_EXTRACT_METADATA_PYTHON_SNIPPET);

        expect(lastSnippet, "expected to capture the snippet action payload").to.exist;

        const setup: string = (lastSnippet && lastSnippet.payload?.setup) ?? "";
        expect(setup).to.match(/pip install/i);
        expect(setup).to.match(/\bbioio\b/i);
        expect(setup).to.match(/\bpandas\b/i);
    });

    it("includes the selected file paths in the generated Code", async () => {
        sandbox.stub(selection.selectors, "getFileSelection").returns({
            fetchAllDetails: async () => [
                { path: "/images/sample1.tif" },
                { path: "/data/x/sample2.czi" },
            ],
        } as any);

        const { store, actions, logicMiddleware } = configureMockStore({
            state: baseVisibleState,
        });

        render(
            <Provider store={store}>
                <Modal />
            </Provider>
        );

        await logicMiddleware.whenComplete();

        expect(
            actions.includesMatch({
                type: interaction.actions.SET_EXTRACT_METADATA_PYTHON_SNIPPET,
            })
        ).to.be.true;

        const lastSnippet = [...actions.list]
            .reverse()
            .find((a) => a.type === interaction.actions.SET_EXTRACT_METADATA_PYTHON_SNIPPET);

        expect(lastSnippet, "expected snippet dispatch with payload").to.exist;

        const code: string = (lastSnippet && lastSnippet.payload?.code) ?? "";
        expect(code).to.include("/images/sample1.tif");
        expect(code).to.include("/data/x/sample2.czi");
        expect(code).to.include("selected_files = [");
        expect(code).to.include("df.to_csv(");
    });

    it("falls back gracefully when fetchAllDetails throws (dispatches empty snippet)", async () => {
        sandbox.stub(selection.selectors, "getFileSelection").returns({
            fetchAllDetails: async () => {
                throw new Error("boom");
            },
        } as any);

        const { store, actions, logicMiddleware } = configureMockStore({
            state: baseVisibleState,
        });

        render(
            <Provider store={store}>
                <Modal />
            </Provider>
        );

        await logicMiddleware.whenComplete();

        expect(
            actions.includesMatch({
                type: interaction.actions.SET_EXTRACT_METADATA_PYTHON_SNIPPET,
            }),
            "expected SET_EXTRACT_METADATA_PYTHON_SNIPPET on error"
        ).to.be.true;

        const last = [...actions.list]
            .reverse()
            .find((a) => a.type === interaction.actions.SET_EXTRACT_METADATA_PYTHON_SNIPPET);

        expect(last).to.exist;

        const payload = (last && last.payload) ?? {};
        expect(payload.setup ?? "").to.be.oneOf([undefined, ""]);
        expect(payload.code ?? "").to.be.oneOf([undefined, ""]);
    });
});
