import * as actions from "./actions";
import logics from "./logics";
import reducer, { initialState, PersistentStateBranch as _PersistentStateBranch } from "./reducer";
import * as selectors from "./selectors";

export type PersistentStateBranch = _PersistentStateBranch;

export default {
    actions,
    initialState,
    logics,
    reducer,
    selectors,
};
