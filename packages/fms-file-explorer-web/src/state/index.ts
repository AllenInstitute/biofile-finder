import { initialState as metadataInitialState } from "./metadata/reducer";
import { initialState as selectionsInitialState } from "./selection/reducer";

import { State } from "./types";

export const initialState: State = Object.freeze({
    metadata: metadataInitialState,
    selection: selectionsInitialState,
});

export { default as metadata } from "./metadata";
export { default as selection } from "./selection";
export { default as createReduxStore } from "./configure-store";
export { enableBatching } from "./util";
export { State } from "./types";
