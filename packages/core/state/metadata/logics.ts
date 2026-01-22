import { uniqBy } from "lodash";
import { createLogic } from "redux-logic";

import { interaction, metadata, ReduxLogicDeps, selection } from "..";
import {
    CREATE_ANNOTATION,
    CreateAnnotationAction,
    RECEIVE_ANNOTATIONS,
    ReceiveAnnotationAction,
    receiveAnnotations,
    receiveDatasetManifest,
    receiveDataSources,
    receivePasswordMapping,
    REQUEST_ANNOTATIONS,
    REQUEST_DATA_SOURCES,
    REQUEST_DATASET_MANIFEST,
    REQUEST_PASSWORD_MAPPING,
    RequestDatasetManifest,
    STORE_NEW_ANNOTATION,
    storeNewAnnotation,
    StoreNewAnnotationAction,
} from "./actions";
import * as metadataSelectors from "./selectors";
import Annotation, { AnnotationResponseMms } from "../../entity/Annotation";
import AnnotationName from "../../entity/Annotation/AnnotationName";
import { AnnotationType, AnnotationTypeIdMap } from "../../entity/AnnotationFormatter";
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

const createNewAnnotationLogic = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { getState, httpClient, action } = deps;
        const {
            payload: { annotation, annotationOptions, user },
        } = action as CreateAnnotationAction;
        const annotationProcessId = annotation.name;
        dispatch(
            interaction.actions.processStart(
                annotationProcessId,
                `Creating new field "${annotation.name}"...`
            )
        );

        const annotationService = interaction.selectors.getAnnotationService(getState());
        const applicationVersion = interaction.selectors.getApplicationVersion(getState());
        if (annotationService instanceof HttpAnnotationService) {
            if (applicationVersion) {
                annotationService.setApplicationVersion(applicationVersion);
            }
            annotationService.setHttpClient(httpClient);
        }

        // HTTP returns the annotation, DB does not
        await new Promise<AnnotationResponseMms[] | void>((resolve, reject) => {
            annotationService
                .createAnnotation(annotation, annotationOptions, user)
                .then((res) => {
                    // For HTTPS annotations, temporarily capture the returned
                    // annotation metadata so that it can be used to edit file metadata
                    if (res?.[0].annotationId) {
                        dispatch(storeNewAnnotation(res?.[0]));
                    }

                    dispatch(
                        interaction.actions.processSuccess(
                            annotationProcessId,
                            `Successfully created new field "${annotation.name}"`
                        )
                    );
                    resolve(res);
                })
                .catch((err) => {
                    const msg = `Sorry, creation of field name/key "${annotation.name}" failed${
                        err?.message
                            ? `: ${err.message}`
                            : ". Please try again later or contact the support team for further assistance."
                    }`;
                    dispatch(interaction.actions.processError(annotationProcessId, msg));
                    reject(err);
                })
                .finally(() => done());
        });
    },
    type: CREATE_ANNOTATION,
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
 * Interceptor responsible for the REQUEST_PASSWORD_MAPPING action
 * which is used to request the password mapping for AICS FMS as a placeholder for
 * a more robust auth solution
 */
const requestPasswordMapping = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const datasetBucketUrl = interaction.selectors.getDatasetBucketUrl(deps.getState());
        const result = await deps.httpClient.get(`${datasetBucketUrl}/metadata_passwords.json`);
        dispatch(receivePasswordMapping(result.data));
        done();
    },
    type: REQUEST_PASSWORD_MAPPING,
});

/**
 * Interceptor responsible for passing the REQUEST_DATASET_MANIFEST action to the database service.
 * Outputs RECEIVE_DATASET_MANIFEST action to request state.
 */
const requestDatasetManifest = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const {
            payload: { name },
        } = deps.action as RequestDatasetManifest;
        const datasetBucketUrl = interaction.selectors.getDatasetBucketUrl(deps.getState());
        const { databaseService } = interaction.selectors.getPlatformDependentServices(
            deps.getState()
        );

        try {
            const uri = `${datasetBucketUrl}/Dataset+Manifest.csv`;
            await databaseService.prepareDataSources([{ name, type: "csv", uri }]);
            dispatch(receiveDatasetManifest(name, uri));
        } catch (err) {
            console.error("Failed to add dataset manifest", err);
        } finally {
            done();
        }
    },
    type: REQUEST_DATASET_MANIFEST,
});

/**
 * This is a workaround to get new annotations to temporarily show up in the store after creation
 * so that they can be used in file metadata editing regardless of whether they've been fully ingested
 */
const storeNewAnnotationLogic = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const {
            payload: { annotation },
        } = deps.action as StoreNewAnnotationAction;
        const annotations = metadata.selectors.getAnnotations(deps.getState());
        const type =
            Object.values(AnnotationTypeIdMap).find((id) => id === annotation.annotationTypeId) ||
            AnnotationType.STRING;
        const newMmsAnnotation = new Annotation({
            annotationName: annotation.name,
            annotationDisplayName: annotation.name,
            annotationId: annotation.annotationId,
            description: annotation.description,
            type: type as AnnotationType,
        });
        dispatch(receiveAnnotations([...annotations, newMmsAnnotation]));
        done();
    },
    type: STORE_NEW_ANNOTATION,
});

export default [
    createNewAnnotationLogic,
    requestAnnotations,
    receiveAnnotationsLogic,
    requestDataSources,
    requestDatasetManifest,
    requestPasswordMapping,
    storeNewAnnotationLogic,
];
