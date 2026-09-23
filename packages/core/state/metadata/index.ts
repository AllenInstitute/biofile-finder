import * as actions from "./actions";
import logics from "./logics";
import reducer, { MetadataStateBranch as _MetadataStateBranch, initialState } from "./reducer";
import * as selectors from "./selectors";

export type MetadataStateBranch = _MetadataStateBranch;

export default {
    actions,
    initialState,
    logics,
    reducer,
    selectors,
};
