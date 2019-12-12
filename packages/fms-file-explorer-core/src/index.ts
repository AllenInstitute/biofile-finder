import { configureStore } from "@aics/redux-utils";

import { middleware, reducer, State } from "./state";

export function createReduxStore(preloadedState?: State) {
    return configureStore<State>({
        middleware,
        preloadedState,
        reducer,
    });
}

export { default } from "./App";
