import { AxiosResponse } from "axios";
import { createLogic } from "redux-logic";

import { ReduxLogicDeps } from "../types";

import { receiveMetadata } from "./actions";
import { REQUEST_METADATA } from "./constants";
import { ReceiveAction } from "./types";

const requestMetadata = createLogic({
    process(deps: ReduxLogicDeps, dispatch: (action: ReceiveAction) => void, done: () => void) {
        const { baseApiUrl, httpClient } = deps;

        httpClient
            .get(`${baseApiUrl}/metadata`)
            .then((metadata: AxiosResponse) => dispatch(receiveMetadata(metadata.data)))
            .catch((reason) => {
                console.log(reason);
            })
            .then(done);
    },
    type: REQUEST_METADATA,
});

export default [requestMetadata];
