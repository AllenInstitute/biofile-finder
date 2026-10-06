// Migrated from https://github.com/AllenCellSoftware/redux-utils (archived Nov 2025)
import { expect } from "chai";
import type { Reducer } from "redux";
import { createLogic, createLogicMiddleware } from "redux-logic";
import * as sinon from "sinon";

import { configureStore, makeReducer, mergeState } from "..";

describe("configureStore", () => {
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

    const logic = createLogic({
        type: "TEST",
        transform(deps, next) {
            const { action } = deps;
            next({
                ...action,
                payload: {
                    stampedByReduxLogic: true,
                },
            });
        },
    });

    const reduxLogicMiddleware = createLogicMiddleware([logic]);

    it("applies middleware if provided", () => {
        const store = configureStore({
            middleware: [reduxLogicMiddleware],
            reducer,
        });

        // initial condition
        expect(store.getState()).to.not.haveOwnProperty("stampedByReduxLogic");

        // act
        store.dispatch({ type: "TEST" });

        // assert
        expect(store.getState()).to.haveOwnProperty("stampedByReduxLogic", true);
    });

    it("applies preloaded state if provided", () => {
        const store = configureStore({
            reducer,
            preloadedState: {
                foo: "goodbye",
                bar: 456,
            },
        });

        const state = store.getState();
        expect(state).to.haveOwnProperty("foo", "goodbye");
        expect(state).to.haveOwnProperty("bar", 456);
    });
});

describe("makeReducer", () => {
    it("runs an action handler if one is provided to handle a specific action type", () => {
        const handlerSpy = sinon.spy((state, action) => ({
            ...state,
            ...action.payload,
        }));
        const action = {
            type: "FOO",
            payload: {
                foo: 456,
            },
        };
        const state = {
            foo: 123,
        };
        const reducer = makeReducer(
            {
                FOO: handlerSpy,
            },
            state
        );

        const newState = reducer(state, action);
        expect(handlerSpy.called).to.equal(true);
        expect(newState).to.haveOwnProperty("foo", 456);
    });

    it("returns existing state if provided action does not have an associated handler", () => {
        const handlerSpy = sinon.spy((state, action) => ({
            ...state,
            ...action.payload,
        }));
        const action = {
            type: "NOT_FOO",
            payload: {
                foo: 456,
            },
        };
        const state = {
            foo: 123,
        };
        const reducer = makeReducer(
            {
                FOO: handlerSpy,
            },
            state
        );

        const newState = reducer(state, action);
        expect(handlerSpy.called).to.equal(false);
        expect(newState).to.haveOwnProperty("foo", 123);
    });
});

describe("mergeState", () => {
    it("merges source state into intial state", () => {
        const initial = { foo: { bar: ["abc"], baz: 123 } };
        const src = { foo: { bar: ["def"] } };

        const merged = mergeState(initial, src);
        expect(merged.foo.bar).to.have.members(["abc", "def"]);
    });

    it("does not mutate initial state", () => {
        const initial = { foo: { bar: ["abc"], baz: 123 } };
        const src = { foo: { bar: ["def"] } };

        const merged = mergeState(initial, src);
        expect(initial).to.not.equal(merged);
        expect(initial.foo).to.not.equal(merged.foo);
        expect(initial.foo.bar).to.not.equal(merged.foo.bar);
    });
});
