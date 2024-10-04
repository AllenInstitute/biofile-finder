import { uniqBy } from "lodash";
import { createLogic } from "redux-logic";

import { interaction, ReduxLogicDeps, selection } from "..";
import {
    RECEIVE_ANNOTATIONS,
    ReceiveAnnotationAction,
    receiveAnnotations,
    receiveDatasetManifest,
    receiveDataSources,
    REQUEST_ANNOTATIONS,
    REQUEST_DATA_SOURCES,
    REQUEST_DATASET_MANIFEST,
    RequestDatasetManifest,
} from "./actions";
import * as metadataSelectors from "./selectors";
import AnnotationName from "../../entity/Annotation/AnnotationName";
import FileSort, { SortOrder } from "../../entity/FileSort";
import HttpAnnotationService from "../../services/AnnotationService/HttpAnnotationService";
import HttpFileService from "../../services/FileService/HttpFileService";

/**
 * Interceptor responsible for turning REQUEST_ANNOTATIONS action into a network call for available annotations. Outputs
 * RECEIVE_ANNOTATIONS actions.
 */
const requestAnnotations = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { getState, httpClient } = deps;
        const annotationService = interaction.selectors.getAnnotationService(getState());
        const fileService = interaction.selectors.getFileService(getState());
        const applicationVersion = interaction.selectors.getApplicationVersion(getState());
        const isAicsEmployee = interaction.selectors.isAicsEmployee(getState());
        if (annotationService instanceof HttpAnnotationService) {
            if (applicationVersion) {
                annotationService.setApplicationVersion(applicationVersion);
            }
            annotationService.setHttpClient(httpClient);
        }

        try {
            const annotations = await annotationService.fetchAnnotations();
            dispatch(receiveAnnotations(annotations));

            if (isAicsEmployee && fileService instanceof HttpFileService) {
                const annotationNames = annotations.map((annotation) => annotation.name);
                await fileService.prepareAnnotationIdCache(annotationNames);
            }
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
        const currentColumns = selection.selectors.getColumns(deps.getState());
        const isQueryingAicsFms = selection.selectors.isQueryingAicsFms(deps.getState());

        const annotationNamesInDataSource = annotations.reduce(
            (set, annotation) => set.add(annotation.name),
            new Set<string>()
        );
        // Filter out any columns that were selected for display that no longer
        // exist as annotations in the data source
        const columnsThatStillExist = currentColumns.filter((column) =>
            annotationNamesInDataSource.has(column.name)
        );
        const columnNamesThatStillExist = columnsThatStillExist.map((column) => column.name);

        // Grab the first countOfColumnsToShow annotations as columns based on the following priority:
        // 1) Was already a column
        // 2) Is just in the data source
        const countOfColumnsToShow = Math.max(4, columnsThatStillExist.length);
        const remainingMaxWidth = columnsThatStillExist.reduce(
            (remainingWidth, column) => remainingWidth - column.width,
            1
        );
        const columns = [
            ...columnsThatStillExist,
            ...annotations
                .filter((annotation) => !columnNamesThatStillExist.includes(annotation.name))
                .slice(0, countOfColumnsToShow - columnsThatStillExist.length)
                .map((annotation) => ({
                    name: annotation.name,
                    width:
                        remainingMaxWidth / (countOfColumnsToShow - columnsThatStillExist.length),
                })),
        ];
        dispatch(selection.actions.setColumns(columns));

        const isCurrentSortColumnValid =
            currentSortColumn && annotationNamesInDataSource.has(currentSortColumn.annotationName);
        if (!isCurrentSortColumnValid) {
            // Default to sorting by "Uploaded" for AICS FMS queries
            if (isQueryingAicsFms) {
                const sortByUploaded = new FileSort(AnnotationName.UPLOADED, SortOrder.DESC);
                dispatch(selection.actions.setSortColumn(sortByUploaded));
            } else {
                dispatch(selection.actions.setSortColumn());
            }
        }

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
        const datasetService = interaction.selectors.getDatasetService(deps.getState());
        const existingDataSources = metadataSelectors.getDataSources(deps.getState());

        try {
            const dataSources = await datasetService.getAll();
            dispatch(receiveDataSources(uniqBy([...existingDataSources, ...dataSources], "id")));
        } catch (err) {
            console.error("Failed to fetch datasets", err);
        } finally {
            done();
        }
    },
    type: [REQUEST_DATA_SOURCES, interaction.actions.REFRESH],
});

/**
 * Interceptor responsible for passing the REQUEST_DATASET_MANIFEST action to the database service.
 * Outputs RECEIVE_DATASET_MANIFEST action to request state.
 */
const requestDatasetManifest = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const {
            payload: { name, uri },
        } = deps.action as RequestDatasetManifest;
        const { databaseService } = interaction.selectors.getPlatformDependentServices(
            deps.getState()
        );

        try {
            if (uri) {
                await databaseService.prepareDataSources([{ name, type: "csv", uri }]);
                dispatch(receiveDatasetManifest(name, uri));
            }
        } catch (err) {
            console.error("Failed to add dataset manifest", err);
        } finally {
            done();
        }
    },
    type: REQUEST_DATASET_MANIFEST,
});

export default [
    requestAnnotations,
    receiveAnnotationsLogic,
    requestDataSources,
    requestDatasetManifest,
];
