import * as actions from "./actions";
import logics from "./logics";
import reducer, { initialState, SelectionStateBranch as _SelectionStateBranch } from "./reducer";
import * as selectors from "./selectors";

export type SelectionStateBranch = _SelectionStateBranch;

export default {
    actions,
    initialState,
    logics,
    reducer,
    selectors,
};
