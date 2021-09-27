import { compact, find } from "lodash";
import { createLogic } from "redux-logic";

import { interaction, ReduxLogicDeps, selection } from "..";
import {
    receiveAnnotations,
    receiveCollections,
    REQUEST_ANNOTATIONS,
    REQUEST_COLLECTIONS,
} from "./actions";
import { AnnotationName, TOP_LEVEL_FILE_ANNOTATIONS } from "../../constants";
import AnnotationService from "../../services/AnnotationService";

/**
 * Interceptor responsible for turning REQUEST_ANNOTATIONS action into a network call for available annotations. Outputs
 * RECEIVE_ANNOTATIONS actions.
 */
const requestAnnotations = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { getState, httpClient } = deps;
        const applicationVersion = interaction.selectors.getApplicationVersion(getState());
        const baseUrl = interaction.selectors.getFileExplorerServiceBaseUrl(getState());
        const annotationService = new AnnotationService({
            applicationVersion,
            baseUrl,
            httpClient,
        });

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

/**
 * Interceptor responsible for turning REQUEST_DATASETS action into a network call for datasets. Outputs
 * RECEIVE_DATASETS action.
 */
const requestCollections = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { getState } = deps;
        const datasetService = interaction.selectors.getDatasetService(getState());

        try {
            const datasets = await datasetService.getDatasets();
            dispatch(receiveCollections(datasets));
        } catch (err) {
            console.error("Failed to fetch datasets", err);
            // TODO: Dispatch alert?
        } finally {
            done();
        }
    },
    type: [REQUEST_COLLECTIONS, interaction.actions.REFRESH],
});

export default [requestAnnotations, requestCollections];
