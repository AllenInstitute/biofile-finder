// Migrated from https://github.com/AllenCellSoftware/redux-utils (archived Nov 2025)
import axios from "axios";
import type { Middleware, Reducer, Store } from "redux";
import { createLogicMiddleware, Logic, LogicMiddleware } from "redux-logic";

import { configureStore, ReduxLogicDependencies } from ".";
import ActionTracker, { Actions } from "./ActionTracker";
import createMockHttpClient, { ResponseStub } from "./mock-http-client";

export interface ConfigureMockStoreConfig<State> {
    state?: State;
    logics?: Logic<any, any, any, any, any, any>[];
    reducer?: Reducer;
    reduxLogicDependencies?: ReduxLogicDependencies;
    responseStubs?: ResponseStub | ResponseStub[];
}

const defaultReduxLogicDeps = {
    httpClient: axios,
};

const defaultReducer: Reducer = (state) => state;

/**
 * Create a mock Redux store with various built-in testing utilities:
 *  - A mechanism for mocking HTTP requests
 *  - A mechanism for reporting and making assertions against what actions have been dispatched
 *  - A mechanism for knowing when all `redux-logic` logics have finished running
 *
 * Example:
 * ```typescript
 *  interface State {
 *      foo: string;
 *      bar: number;
 *  }
 *
 *  const initialState = {
 *      foo: "hello",
 *      bar: 123,
 *  };
 *
 *  const simpleReducer: Reducer = (state = initialState, action) => {
 *      if (action.payload) {
 *          return {
 *              ...state,
 *              ...action.payload,
 *          };
 *      }
 *
 *      return state;
 *  };
 *
 *  const logic = createLogic({
 *      type: "TEST1",
 *      process: async (deps, dispatch, done) {
 *          const response = await deps.httpClient.get("/api/1.0/foo/bar");
 *          dispatch({ type: "TEST3", payload: response.data });
 *          done();
 *      },
 *  });
 *
 *  const responseStub = {
 *      when: "/api/1.0/foo/bar",
 *      respondWith: { data: "Hello from the endpoint" },
 *  };
 *
 * const { store, actions, logicMiddleware } = configureMockStore<State>({
 *     state: initialState,
 *     reducer: simpleReducer,
 *     responseStubs: [responseStub]
 *     logics: [logic],
 * });
 *
 *
 * store.dispatch({ type: "TEST1" });
 * await logicMiddleware.whenComplete();
 *
 *
 * expect(actions.includes({ type: "TEST1" })).to.be.true;
 * expect(actions.includes({ type: "TEST3", payload: "Hello from the endpoint" })).to.be.true; // dispatched by logic
 * ```
 */
export default function configureMockStore<State>(config: ConfigureMockStoreConfig<State> = {}): {
    store: Store;
    logicMiddleware: LogicMiddleware;
    actions: Actions;
} {
    const {
        state = {},
        logics = [],
        reducer = defaultReducer,
        reduxLogicDependencies = defaultReduxLogicDeps,
        responseStubs = [],
    } = config;

    // redux-logic middleware
    const logicMiddleware = createLogicMiddleware(logics);
    reduxLogicDependencies.httpClient = createMockHttpClient(responseStubs);
    logicMiddleware.addDeps(reduxLogicDependencies);

    // action tracking middleware
    const actionTracker = new ActionTracker();
    const trackActionsMiddleware: Middleware = () => (next) => (action) => {
        actionTracker.track(action);
        return next(action);
    };

    return {
        store: configureStore({
            middleware: [logicMiddleware, trackActionsMiddleware],
            reducer,
            preloadedState: state,
        }),
        logicMiddleware,
        actions: actionTracker.actions,
    };
}
