import { uniqBy } from "lodash";
import { createLogic } from "redux-logic";

import { interaction, ReduxLogicDeps, selection } from "..";
import {
    RECEIVE_ANNOTATIONS,
    ReceiveAnnotationAction,
    receiveAnnotations,
    receiveDataSources,
    REQUEST_ANNOTATIONS,
    REQUEST_DATA_SOURCES,
} from "./actions";
import * as metadataSelectors from "./selectors";
import Annotation from "../../entity/Annotation";
import AnnotationName from "../../entity/Annotation/AnnotationName";
import FileSort, { SortOrder } from "../../entity/FileSort";
import HttpAnnotationService from "../../services/AnnotationService/HttpAnnotationService";

/**
 * Interceptor responsible for turning REQUEST_ANNOTATIONS action into a network call for available annotations. Outputs
 * RECEIVE_ANNOTATIONS actions.
 */
const requestAnnotations = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { getState, httpClient } = deps;
        const annotationService = interaction.selectors.getAnnotationService(getState());
        const applicationVersion = interaction.selectors.getApplicationVersion(getState());
        if (annotationService instanceof HttpAnnotationService) {
            if (applicationVersion) {
                annotationService.setApplicationVersion(applicationVersion);
            }
            annotationService.setHttpClient(httpClient);
        }

        try {
            const annotations = await annotationService.fetchAnnotations();
            dispatch(receiveAnnotations(annotations));
        } catch (err) {
            console.error("Failed to fetch annotations", err);
        } finally {
            done();
        }
        done();
    },
    type: REQUEST_ANNOTATIONS,
});

/**
 * Interceptor responsible for turning REQUEST_DATA_SOURCES action into selecting default
 * display annotations
 */
const receiveAnnotationsLogic = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const actions = deps.action as ReceiveAnnotationAction;
        const annotations = actions.payload;
        const currentSortColumn = selection.selectors.getSortColumn(deps.getState());
        const currentDisplayAnnotations = selection.selectors.getAnnotationsToDisplay(
            deps.getState()
        );

        const annotationNameToAnnotationMap = annotations.reduce(
            (map, annotation) => ({ ...map, [annotation.name]: annotation }),
            {} as Record<string, Annotation>
        );
        // Filter out any annotations that were selected for display that no longer
        // exist as annotations in the state
        const displayAnnotationsThatStillExist = currentDisplayAnnotations.flatMap((annotation) =>
            annotation.name in annotationNameToAnnotationMap
                ? [annotationNameToAnnotationMap[annotation.name]]
                : []
        );

        // These are the default annotations we want to display so this will
        // iterate over each of the default annotations and add them as display
        // annotations IF the annotations exist in the data source and we have room
        // to display them
        [
            "File Name",
            AnnotationName.FILE_NAME,
            AnnotationName.KIND,
            AnnotationName.TYPE,
            AnnotationName.FILE_SIZE,
        ].forEach((annotationName) => {
            const isAlreadyDisplayed = displayAnnotationsThatStillExist.some(
                (annotation) => annotation.name === annotationName
            );
            const existsInDataSource = annotationName in annotationNameToAnnotationMap;
            const canFitInList = displayAnnotationsThatStillExist.length < 4;
            if (!isAlreadyDisplayed && existsInDataSource && canFitInList) {
                displayAnnotationsThatStillExist.push(
                    annotationNameToAnnotationMap[annotationName]
                );
            }
        });

        // In the event we can't find the above annotations, just grab some random ones
        // until we have 4 to display
        for (
            let i = 0;
            displayAnnotationsThatStillExist.length < 4 && i < annotations.length;
            i++
        ) {
            if (
                !displayAnnotationsThatStillExist.find(
                    (annotation) => annotation.name === annotations[i].name
                )
            ) {
                displayAnnotationsThatStillExist.push(annotations[i]);
            }
        }

        // If the current sort column is not valid and we can default the using the "Uploaded" column try to do so
        const isCurrentSortColumnValid =
            currentSortColumn &&
            annotations.some((annotation) => annotation.name === currentSortColumn.annotationName);
        if (
            !isCurrentSortColumnValid &&
            annotations.some((annotation) => annotation.name === AnnotationName.UPLOADED)
        ) {
            const sortByUploaded = new FileSort(AnnotationName.UPLOADED, SortOrder.DESC);
            dispatch(selection.actions.setSortColumn(sortByUploaded));
        }
        dispatch(selection.actions.setDisplayAnnotations(displayAnnotationsThatStillExist));
        done();
    },
    type: RECEIVE_ANNOTATIONS,
});

/**
 * Interceptor responsible for turning REQUEST_DATA_SOURCES action into a network call for data source. Outputs
 * RECEIVE_DATA_SOURCES action.
 */
const requestDataSources = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const dataSourceService = interaction.selectors.getDataSourceService(deps.getState());
        const existingDataSources = metadataSelectors.getDataSources(deps.getState());

        try {
            const dataSources = await dataSourceService.getAll();
            dispatch(receiveDataSources(uniqBy([...existingDataSources, ...dataSources], "name")));
        } catch (err) {
            console.error("Failed to fetch data sources", err);
        } finally {
            done();
        }
    },
    type: [REQUEST_DATA_SOURCES, interaction.actions.REFRESH],
});

export default [requestAnnotations, receiveAnnotationsLogic, requestDataSources];
