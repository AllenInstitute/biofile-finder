import { createLogic } from "redux-logic";

import { ReduxLogicDeps } from "..";
import { receiveAnnotations, REQUEST_ANNOTATIONS } from "./actions";
import AnnotationService from "../../services/AnnotationService";
import interaction from "../interaction";

/**
 * Interceptor responsible for turning REQUEST_ANNOTATIONS action into a network call for available annotations. Outputs
 * RECEIVE_ANNOTATIONS actions.
 */
const requestAnnotations = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { getState } = deps;
        const baseUrl = interaction.selectors.getFileExplorerServiceBaseUrl(getState());
        const annotationService = new AnnotationService({ baseUrl });

        try {
            dispatch(receiveAnnotations(await annotationService.fetchAnnotations()));
        } catch (err) {
            console.error("Something went wrong, nobody knows why. But here's a hint:", err);
        } finally {
            done();
        }
    },
    type: REQUEST_ANNOTATIONS,
});

export default [requestAnnotations];
