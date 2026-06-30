import { isEqual, uniqBy } from "lodash";
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
import FileFilter from "../../entity/FileFilter";
import FileSort, { SortOrder } from "../../entity/FileSort";
import { DEFAULT_COLUMN_WIDTH } from "../../entity/SearchParams";
import { Column } from "../selection/actions";
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
    },
    type: REQUEST_ANNOTATIONS,
});

// TODO: This logic is getting triggered twice unnecessarily:
// reproduce by starting with AICS FMS query (or probably any other)
// then adding a new query with new data source
/**
 * Interceptor responsible for turning REQUEST_DATA_SOURCES action into selecting default
 * display annotations
 */
const receiveAnnotationsLogic = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { payload: annotations } = deps.action as ReceiveAnnotationAction;
        const annotationByName = new Map(
            annotations.map((annotation) => [annotation.name, annotation])
        );
        const annotationService = interaction.selectors.getAnnotationService(deps.getState());
        const currentSortColumn = selection.selectors.getSortColumn(deps.getState());
        const currentColumns = selection.selectors.getColumns(deps.getState());
        const isQueryingAicsFms = selection.selectors.isQueryingAicsFms(deps.getState());
        const currentFilters = selection.selectors.getFileFilters(deps.getState());

        const isCurrentSortColumnValid =
            currentSortColumn && annotationByName.has(currentSortColumn.annotationName);
        if (!isCurrentSortColumnValid) {
            // Default to sorting by "Uploaded" for AICS FMS queries
            if (isQueryingAicsFms) {
                const sortByUploaded = new FileSort(AnnotationName.UPLOADED, SortOrder.DESC);
                dispatch(selection.actions.setSortColumn(sortByUploaded));
            } else {
                dispatch(selection.actions.setSortColumn());
            }
        }

        // Enrich active filters with annotationType
        const enrichedFilters = currentFilters.map((filter) => {
            const annotation = annotationByName.get(filter.name);
            // TODO: We should migrate annotation info out of filter so that
            // things like this are unnecessary - avoiding for now to conserve line changes
            if (!annotation) return filter; // no matching annotation — leave as-is

            // Return the same object if nothing would change, so the reference-equality
            // check below can correctly detect a no-op and skip the dispatch.
            const isTypeUnchanged = annotation.type === filter.valueType;
            if (isTypeUnchanged) return filter;

            return new FileFilter(filter.name, filter.value, filter.type, annotation.type);
        });

        // Only dispatch if at least one filter actually changed
        const hasChanges = enrichedFilters.some((f, i) => f !== currentFilters[i]);
        if (hasChanges) {
            dispatch(selection.actions.setFileFilters(enrichedFilters));
        }

        // This request should be unable to take longer than 2 seconds
        const widthByAnnotation = await annotationService.fetchOptimalWidthForAnnotations(
            annotations
        );

        const columns: Column[] = annotations
            // Exclude parents of nested fields since they don't have their own values to display
            .filter((annotation) => !annotationByName.get(annotation.name)?.isParent)
            .map((annotation) => ({
                annotation: annotation,
                currentColumnIndex: currentColumns.findIndex(
                    (column) => column.name === annotation.name
                ),
            }))
            .sort((a, b) => {
                const { annotation: annotationA, currentColumnIndex: indexA } = a;
                const { annotation: annotationB, currentColumnIndex: indexB } = b;
                // Move columns that were already selected for display to the front, in their existing order
                if (indexA !== -1 && indexB !== -1) {
                    return indexA - indexB;
                }
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;

                // Move "File Name" to the front then sort alphabetically
                if (annotationA.displayName === "File Name") return -1;
                if (annotationB.displayName === "File Name") return 1;
                return annotationA.name.localeCompare(annotationB.name);
            })
            .map(({ annotation, currentColumnIndex }) => {
                // If the column for this annotation already exists, keep its current width
                if (currentColumnIndex !== -1) {
                    return currentColumns[currentColumnIndex];
                }
                return {
                    name: annotation.name,
                    width: widthByAnnotation.get(annotation.name) ?? DEFAULT_COLUMN_WIDTH,
                };
            });

        // Only dispatch if at least one column actually changed
        if (!isEqual(columns, currentColumns)) {
            dispatch(selection.actions.setColumns(columns));
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
            (Object.entries(AnnotationTypeIdMap).find(
                ([_type, id]) => id === annotation.annotationTypeId
            )?.[0] as AnnotationType) || AnnotationType.STRING;
        const newMmsAnnotation = new Annotation({
            type,
            annotationName: annotation.name,
            annotationDisplayName: annotation.name,
            annotationId: annotation.annotationId,
            description: annotation.description,
            pathIsArray: [false],
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
