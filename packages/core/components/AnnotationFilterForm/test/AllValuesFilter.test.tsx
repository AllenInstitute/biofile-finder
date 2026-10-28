import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";
import { createSandbox } from "sinon";

import AnnotationFilterForm from "..";
import { FESBaseUrl } from "../../../constants";
import Annotation from "../../../entity/Annotation";
import { AnnotationType } from "../../../entity/AnnotationFormatter";
import FileFilter, { FilterType } from "../../../entity/FileFilter";
import AnyValueFilter from "../../../entity/FileFilter/AnyValueFilter";
import HttpAnnotationService from "../../../services/AnnotationService/HttpAnnotationService";
import { initialState, interaction, reducer, reduxLogics, selection } from "../../../state";
import { configureMockStore, createMockHttpClient, mergeState } from "../../../util/redux-utils";

describe("<AnnotationFilterForm /> some / all / contains modes", () => {
    const LIST_ITEM_PREFIX = "default-button-";
    const REPLACE_WARNING = /will replace the current results/;
    const foo = new Annotation({
        annotationDisplayName: "Foo",
        annotationName: "foo",
        description: "",
        type: AnnotationType.STRING,
    });
    const sandbox = createSandbox();

    afterEach(() => sandbox.restore());

    function setup(filters: FileFilter[]) {
        const responseStub = {
            when: `${FESBaseUrl.TEST}/file-explorer-service/1.0/annotations/foo/values`,
            respondWith: { data: { data: ["a", "b", "c", "d"] } },
        };
        const annotationService = new HttpAnnotationService({
            fileExplorerServiceBaseUrl: FESBaseUrl.TEST,
            httpClient: createMockHttpClient(responseStub),
        });
        sandbox.stub(interaction.selectors, "getAnnotationService").returns(annotationService);
        sandbox.stub(interaction.selectors, "getCanSupportAdvancedFilters").returns(true);
        const { store, logicMiddleware } = configureMockStore({
            logics: reduxLogics,
            state: mergeState(initialState, { selection: { filters } }),
            reducer,
            responseStubs: responseStub,
        });
        const utils = render(
            <Provider store={store}>
                <AnnotationFilterForm annotation={foo} />
            </Provider>
        );
        // "value:type" for each filter on the annotation, in state order
        const current = () =>
            selection.selectors.getFileFilters(store.getState()).map((f) => `${f.value}:${f.type}`);
        return { ...utils, current, settle: () => logicMiddleware.whenComplete() };
    }

    // The mode radios update the form asynchronously, so wait until the choice has landed
    const pickMode = async (label: string) => {
        fireEvent.click(screen.getByLabelText(label));
        await waitFor(() =>
            expect((screen.getByLabelText(label) as HTMLInputElement).checked).to.equal(true)
        );
        await new Promise((resolve) => setTimeout(resolve, 100));
    };
    const search = (value: string) => {
        const searchbox = screen.getByRole("searchbox");
        fireEvent.change(searchbox, { target: { value } });
        fireEvent.keyDown(searchbox, { key: "Enter", code: "Enter", keyCode: 13 });
    };
    const chooseOperator = async (container: HTMLElement, text: string) => {
        fireEvent.click(container.querySelector(".ms-ComboBox button") as HTMLElement);
        fireEvent.click(await screen.findByText(text));
    };
    const openSearchTab = async () => fireEvent.click(await screen.findByText("Search"));

    describe("picking from the list", () => {
        it("creates ALL filters in 'All values' mode, even for the first pick", async () => {
            const { getByTestId, current, settle } = setup([]);
            await waitFor(() => expect(getByTestId(`${LIST_ITEM_PREFIX}a`)).to.exist);

            await pickMode("All values");
            fireEvent.click(getByTestId(`${LIST_ITEM_PREFIX}a`));
            await settle();
            fireEvent.click(getByTestId(`${LIST_ITEM_PREFIX}b`));
            await settle();
            expect(current()).to.deep.equal(["a:all", "b:all"]);

            fireEvent.click(getByTestId(`${LIST_ITEM_PREFIX}a`));
            await settle();
            expect(current()).to.deep.equal(["b:all"]);
        });

        it("creates exact (not contains) filters after a Contains filter was applied", async () => {
            const { findByText, getByTestId, current, settle } = setup([
                new FileFilter("foo", "a", FilterType.FUZZY),
            ]);
            fireEvent.click(await findByText("Browse list"));
            fireEvent.click(getByTestId(`${LIST_ITEM_PREFIX}b`));
            await settle();
            expect(current()).to.deep.equal(["b:default"]);
        });
    });

    describe("switching between 'Some value(s)' and 'All values'", () => {
        it("converts exact filters both ways, keeping their values", async () => {
            const { getByTestId, current, settle } = setup([
                new FileFilter("foo", "a"),
                new FileFilter("foo", "b"),
            ]);
            await waitFor(() => expect(getByTestId(`${LIST_ITEM_PREFIX}a`)).to.exist);

            await pickMode("All values");
            await settle();
            expect(current()).to.deep.equal(["a:all", "b:all"]);

            await pickMode("Some value(s)");
            await settle();
            expect(current()).to.deep.equal(["a:default", "b:default"]);
        });

        it("keeps contains filters as contains filters both ways", async () => {
            const { findByDisplayValue, current, settle } = setup([
                new FileFilter("foo", "a", FilterType.FUZZY),
                new FileFilter("foo", "b", FilterType.FUZZY),
            ]);
            await findByDisplayValue("Contains");

            await pickMode("All values");
            await settle();
            expect(current()).to.deep.equal(["a:fuzzyAll", "b:fuzzyAll"]);

            await pickMode("Some value(s)");
            await settle();
            expect(current()).to.deep.equal(["a:fuzzy", "b:fuzzy"]);
        });
    });

    describe("switching from 'Any value' / 'No value'", () => {
        it("keeps the filter until a value is chosen, then replaces it (all values)", async () => {
            const { getByTestId, current, settle } = setup([new AnyValueFilter("foo")]);
            await waitFor(() => expect(screen.getByLabelText("All values")).to.exist);

            await pickMode("All values");
            await settle();
            // The row (and the edit menu it lives in) would unmount if this were removed early
            expect(current()).to.deep.equal([":include"]);

            await waitFor(() => expect(getByTestId(`${LIST_ITEM_PREFIX}a`)).to.exist);
            fireEvent.click(getByTestId(`${LIST_ITEM_PREFIX}a`));
            await settle();
            expect(current()).to.deep.equal(["a:all"]);
        });

        it("behaves the same for 'Some value(s)'", async () => {
            const { getByTestId, current, settle } = setup([new AnyValueFilter("foo")]);
            await waitFor(() => expect(screen.getByLabelText("Some value(s)")).to.exist);

            await pickMode("All values");
            await pickMode("Some value(s)");
            await settle();
            expect(current()).to.deep.equal([":include"]);

            await waitFor(() => expect(getByTestId(`${LIST_ITEM_PREFIX}a`)).to.exist);
            fireEvent.click(getByTestId(`${LIST_ITEM_PREFIX}a`));
            await settle();
            expect(current()).to.deep.equal(["a:default"]);
        });

        it("clears value filters when switching from 'All values' to 'Any value'", async () => {
            const { getByTestId, current, settle } = setup([
                new FileFilter("foo", "a", FilterType.ALL),
                new FileFilter("foo", "b", FilterType.ALL),
            ]);
            await waitFor(() => expect(getByTestId(`${LIST_ITEM_PREFIX}a`)).to.exist);

            await pickMode("Any value");
            await settle();
            expect(current()).to.deep.equal([":include"]);
        });
    });

    describe("searching", () => {
        it("commits exact searches as ALL and Contains searches as FUZZY_ALL in 'All values' mode", async () => {
            const { container, current, settle } = setup([]);
            await openSearchTab();
            await pickMode("All values");

            await chooseOperator(container, "Exactly matches");
            search("a");
            await settle();
            search("b");
            await settle();
            expect(current()).to.deep.equal(["a:all", "b:all"]);

            // Switching match style replaces the existing values
            await chooseOperator(container, "Contains");
            search("c");
            await settle();
            expect(current()).to.deep.equal(["c:fuzzyAll"]);
            search("d");
            await settle();
            expect(current()).to.deep.equal(["c:fuzzyAll", "d:fuzzyAll"]);

            await chooseOperator(container, "Exactly matches");
            search("a");
            await settle();
            expect(current()).to.deep.equal(["a:all"]);
        });

        it("commits an exact search as DEFAULT after a Contains filter was applied", async () => {
            const { container, findByDisplayValue, current, settle } = setup([
                new FileFilter("foo", "a", FilterType.FUZZY),
            ]);
            await findByDisplayValue("Contains");
            await chooseOperator(container, "Exactly matches");
            search("b");
            await settle();
            expect(current()).to.deep.equal(["b:default"]);
        });
    });

    describe("the 'will replace the current results' warning", () => {
        const typeValue = (value: string) =>
            fireEvent.change(screen.getByRole("searchbox"), { target: { value } });

        it("is not shown when nothing is committed", async () => {
            setup([]);
            await openSearchTab();
            typeValue("b");
            expect(screen.queryByText(REPLACE_WARNING)).to.equal(null);
        });

        it("is shown only when the match style differs from the committed values", async () => {
            const { container } = setup([new FileFilter("foo", "a")]);
            await openSearchTab();
            // starts on "Exactly matches", like the committed value
            typeValue("b");
            expect(screen.queryByText(REPLACE_WARNING)).to.equal(null);

            await chooseOperator(container, "Contains");
            await waitFor(() => expect(screen.queryByText(REPLACE_WARNING)).to.not.equal(null));
        });

        it("is shown when any committed value has a different style, not just the first", async () => {
            const { container } = setup([
                new FileFilter("foo", "a", FilterType.ALL),
                new FileFilter("foo", "b", FilterType.FUZZY_ALL),
            ]);
            await openSearchTab();
            await chooseOperator(container, "Exactly matches");
            typeValue("c");
            expect(screen.queryByText(REPLACE_WARNING)).to.not.equal(null);
        });
    });
});
