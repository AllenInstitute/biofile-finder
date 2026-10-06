// Migrated from https://github.com/AllenCellSoftware/redux-utils (archived Nov 2025)
import { expect } from "chai";
import type { Reducer } from "redux";
import { createLogic } from "redux-logic";

import { configureMockStore, ReduxLogicDependencies } from "..";

describe("configureMockReduxStore", () => {
    interface State {
        foo: string;
        bar: number;
    }

    const initialState = {
        foo: "hello",
        bar: 123,
    };

    const reducer: Reducer = (state = initialState, action) => {
        if (action.payload) {
            return {
                ...state,
                ...action.payload,
            };
        }

        return state;
    };

    const responseStub = {
        when: "/api/1.0/foo/bar",
        respondWith: { data: "Hello from the endpoint" },
    };

    const dispatchExtraAction = createLogic({
        type: "TEST1",
        process(deps, dispatch, done) {
            dispatch({ type: "TEST2" });
            done();
        },
    });

    const makeHttpCall = createLogic({
        type: "TEST1",
        process: async (deps: ReduxLogicDependencies, dispatch, done) => {
            if (!deps.httpClient) {
                return;
            }

            const response = await deps.httpClient.get("/api/1.0/foo/bar");
            dispatch({ type: "TEST2", payload: response.data });
            done();
        },
    });

    it("creates a store with a mechanism for tracking dispatched actions", () => {
        const { store, actions } = configureMockStore<State>({
            state: initialState,
            reducer,
        });

        // initial condition
        expect(store.getState()).to.haveOwnProperty("foo", "hello");

        // act
        const action = { type: "TEST", payload: { foo: "goodbye" } };
        store.dispatch(action);

        // assert
        expect(actions.includes(action)).to.be.true;
        expect(store.getState()).to.haveOwnProperty("foo", "goodbye");
    });

    it("creates a store with a mechanism for injecting redux-logic Logics", async () => {
        const { store, actions, logicMiddleware } = configureMockStore<State>({
            state: initialState,
            reducer,
            logics: [dispatchExtraAction],
        });

        // act
        store.dispatch({ type: "TEST1" });
        await logicMiddleware.whenComplete();

        // assert
        expect(actions.includesMatch({ type: "TEST1" })).to.be.true;
        expect(actions.includesMatch({ type: "TEST2" })).to.be.true; // dispatched by logic
    });

    it("creates a store with a mechanism for mocking HTTP requests", async () => {
        const { store, actions, logicMiddleware } = configureMockStore<State>({
            state: initialState,
            reducer,
            responseStubs: [responseStub],
            logics: [makeHttpCall],
        });

        // act
        store.dispatch({ type: "TEST1" });
        await logicMiddleware.whenComplete();

        // assert
        expect(actions.includes({ type: "TEST1" })).to.be.true;
        expect(actions.includes({ type: "TEST2", payload: "Hello from the endpoint" })).to.be.true; // dispatched by logic
    });
});
