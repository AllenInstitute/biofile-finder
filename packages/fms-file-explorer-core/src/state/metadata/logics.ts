import { createLogic } from "redux-logic";

import { interaction, metadata, ReduxLogicDeps } from "..";
import { receiveAnnotations, REQUEST_ANNOTATIONS, REQUEST_ANNOTATION_VALUES } from "./actions";
import Annotation from "../../entity/Annotation";
import AnnotationService from "../../services/AnnotationService";

/**
 * Interceptor responsible for turning REQUEST_ANNOTATIONS action into a network call for available annotations. Outputs
 * RECEIVE_ANNOTATIONS actions.
 */
const requestAnnotations = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { getState, httpClient } = deps;
        const baseUrl = interaction.selectors.getFileExplorerServiceBaseUrl(getState());
        const annotationService = new AnnotationService({ baseUrl, httpClient });

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

/**
 * Interceptor responsible for turning REQUEST_ANNOTATION_VALUES action into a network call for available annotation values.
 * Outputs RECEIVE_ANNOTATION_VALUES action.
 */
const requestAnnotationValues = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { action, getState, httpClient } = deps;
        const baseUrl = interaction.selectors.getFileExplorerServiceBaseUrl(getState());
        const annotationService = new AnnotationService({ baseUrl, httpClient });

        try {
            const values = await annotationService.fetchValues(action.payload);
            const annotations = metadata.selectors.getAnnotations(getState()).map((a) => {
                // Replace the values of the annotation we were requested to fetch
                if (a.name === action.payload) {
                    return new Annotation(
                        {
                            annotationDisplayName: a.displayName,
                            annotationName: a.name,
                            description: a.description,
                            type: a.type,
                        },
                        values
                    );
                }
                return a;
            });
            dispatch(receiveAnnotations(annotations));
        } catch (err) {
            console.error(
                "Something went wrong requesting values for an annotation, nobody knows why. But here's a hint:",
                err
            );
        } finally {
            done();
        }
    },
    type: REQUEST_ANNOTATION_VALUES,
});

export default [requestAnnotations, requestAnnotationValues];
