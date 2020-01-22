import { createLogic } from "redux-logic";

import { receiveAnnotations, REQUEST_ANNOTATIONS } from "./actions";
import AnnotationService from "../../services/AnnotationService";

/**
 * Interceptor responsible for turning REQUEST_ANNOTATIONS action into a network call for available annotations. Outputs
 * RECEIVE_ANNOTATIONS actions.
 */
const requestAnnotations = createLogic({
    async process(deps, dispatch, done) {
        try {
            dispatch(receiveAnnotations(await AnnotationService.fetchAnnotations()));
        } catch (err) {
            console.error("Something went wrong, nobody knows why. But here's a hint:", err);
        } finally {
            done();
        }
    },
    type: REQUEST_ANNOTATIONS,
});

export default [requestAnnotations];
