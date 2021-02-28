import * as actions from "./actions";
import logics from "./logics";
import reducer, { initialState, MetadataStateBranch as _MetadataStateBranch } from "./reducer";
import * as selectors from "./selectors";

export type MetadataStateBranch = _MetadataStateBranch;

export default {
    actions,
    initialState,
    logics,
    reducer,
    selectors,
};
