import { makeConstant } from "../util";

const STATE_BRANCH_NAME = "selection";

export const DESELECT_FILE = makeConstant(STATE_BRANCH_NAME, "deselect-file");
export const SELECT_FILE = makeConstant(STATE_BRANCH_NAME, "select-file");
export const SELECT_METADATA = makeConstant(STATE_BRANCH_NAME, "select_metadata");
