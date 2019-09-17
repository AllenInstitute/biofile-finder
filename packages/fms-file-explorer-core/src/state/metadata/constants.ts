import { makeConstant } from "../util";

const STATE_BRANCH_NAME = "metadata";

export const RECEIVE_METADATA = makeConstant(STATE_BRANCH_NAME, "receive");
export const REQUEST_METADATA = makeConstant(STATE_BRANCH_NAME, "request");
