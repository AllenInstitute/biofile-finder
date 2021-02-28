import * as actions from "./actions";
import logics from "./logics";
import reducer, {
    initialState,
    InteractionStateBranch as _InteractionStateBranch,
} from "./reducer";
import * as selectors from "./selectors";

export type InteractionStateBranch = _InteractionStateBranch;

export default {
    actions,
    initialState,
    logics,
    reducer,
    selectors,
};
