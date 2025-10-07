import * as actions from "./actions";
import logics from "./logics";
import reducer, { initialState, ProvenanceStateBranch as _ProvenanceStateBranch } from "./reducer";
import * as selectors from "./selectors";

// Branch intended for managing the provenance graph itself, not the data source
export type ProvenanceStateBranch = _ProvenanceStateBranch;

export default {
    actions,
    initialState,
    logics,
    reducer,
    selectors,
};
