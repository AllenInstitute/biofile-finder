import { compact, find } from "lodash";
import { createLogic } from "redux-logic";

import { interaction, ReduxLogicDeps, selection } from "..";
import { receiveAnnotations, REQUEST_ANNOTATIONS } from "./actions";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "./reducer";
import { AnnotationName } from "../../constants";
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
            const annotations = await annotationService.fetchAnnotations();
            const defaultDisplayAnnotations = compact([
                find(
                    TOP_LEVEL_FILE_ANNOTATIONS,
                    (annotation) => annotation.name === AnnotationName.FILE_NAME
                ),
                find(annotations, (annotation) => annotation.name === AnnotationName.KIND),
                find(annotations, (annotation) => annotation.name === AnnotationName.TYPE),
                find(
                    TOP_LEVEL_FILE_ANNOTATIONS,
                    (annotation) => annotation.name === AnnotationName.FILE_SIZE
                ),
            ]);

            dispatch(receiveAnnotations(annotations));
            dispatch(selection.actions.selectDisplayAnnotation(defaultDisplayAnnotations, true));
        } catch (err) {
            console.error("Failed to fetch annotations", err);
        } finally {
            done();
        }
    },
    type: REQUEST_ANNOTATIONS,
});

export default [requestAnnotations];
