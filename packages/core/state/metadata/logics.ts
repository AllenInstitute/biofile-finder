import { createLogic } from "redux-logic";

import { interaction, ReduxLogicDeps, selection } from "..";
import {
    RECEIVE_ANNOTATIONS,
    ReceiveAnnotationAction,
    receiveAnnotations,
    receiveCollections,
    REQUEST_ANNOTATIONS,
    REQUEST_COLLECTIONS,
} from "./actions";
import { AnnotationName } from "../../constants";
import Annotation from "../../entity/Annotation";

/**
 * Interceptor responsible for turning REQUEST_ANNOTATIONS action into a network call for available annotations. Outputs
 * RECEIVE_ANNOTATIONS actions.
 */
const requestAnnotations = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { getState } = deps;
        const annotationService = interaction.selectors.getAnnotationService(getState());

        try {
            const annotations = await annotationService.fetchAnnotations();
            dispatch(receiveAnnotations(annotations));
        } catch (err) {
            console.error("Failed to fetch annotations", err);
        } finally {
            done();
        }
    },
    type: REQUEST_ANNOTATIONS,
});

/**
 * Interceptor responsible for turning REQUEST_COLLECTIONS action into selecting default
 * display annotations
 */
const receiveAnnotationsLogic = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const actions = deps.action as ReceiveAnnotationAction;
        const annotations = actions.payload;
        const currentDisplayAnnotations = selection.selectors.getAnnotationsToDisplay(
            deps.getState()
        );

        // TODO: Load in some from persistent config storage
        const annotationNameToAnnotationMap = annotations.reduce(
            (map, annotation) => ({ ...map, [annotation.name]: annotation }),
            {} as Record<string, Annotation>
        );
        const displayAnnotations = currentDisplayAnnotations.filter(
            (annotation) => !!annotationNameToAnnotationMap[annotation.name]
        );
        [
            AnnotationName.FILE_NAME,
            AnnotationName.KIND,
            AnnotationName.TYPE,
            AnnotationName.FILE_SIZE,
        ].forEach((annotationName) => {
            if (
                !displayAnnotations.find((annotation) => annotation.name === annotationName) &&
                annotationNameToAnnotationMap[annotationName]
            ) {
                displayAnnotations.push(annotationNameToAnnotationMap[annotationName]);
            }
        });

        // In the event we can't find the above annotations, just grab some random ones
        // until we have 4 to display
        for (let i = 0; displayAnnotations.length < 4 && i < annotations.length; i++) {
            if (!displayAnnotations.find((annotation) => annotation.name === annotations[i].name)) {
                displayAnnotations.push(annotations[i]);
            }
        }

        dispatch(selection.actions.selectDisplayAnnotation(displayAnnotations, true));
        done();
    },
    type: RECEIVE_ANNOTATIONS,
});

/**
 * Interceptor responsible for turning REQUEST_COLLECTIONS action into a network call for collections. Outputs
 * RECEIVE_COLLECTIONS action.
 */
const requestCollections = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const datasetService = interaction.selectors.getDatasetService(deps.getState());

        try {
            const collections = await datasetService.getDatasets();
            dispatch(receiveCollections(collections));
        } catch (err) {
            // TODO: Grab collections from S3 manifest
            console.error("Failed to fetch datasets", err);
        } finally {
            done();
        }
    },
    type: [REQUEST_COLLECTIONS, interaction.actions.REFRESH],
});

export default [requestAnnotations, receiveAnnotationsLogic, requestCollections];
