import * as actions from "./actions";
import logics from "./logics";
import reducer, { initialState } from "./reducer";
import * as selectors from "./selectors";

export { MetadataStateBranch } from "./reducer";

export default {
    actions,
    initialState,
    logics,
    reducer,
    selectors,
};
