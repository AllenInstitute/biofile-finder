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
        const { payload: annotations } = deps.action as ReceiveAnnotationAction;
        const annotationService = interaction.selectors.getAnnotationService(deps.getState());
        const currentSortColumn = selection.selectors.getSortColumn(deps.getState());
        const currentColumns = selection.selectors.getColumns(deps.getState());
        const isQueryingAicsFms = selection.selectors.isQueryingAicsFms(deps.getState());
        const currentFilters = selection.selectors.getFileFilters(deps.getState());

        const annotationNamesInDataSource = annotations.reduce(
            (set, annotation) => set.add(annotation.name),
            new Set<string>()
        );
        // Filter out any columns that were selected for display that no longer
        // exist as annotations in the data source (or are nested parent columns)
        const columnsThatStillExist = currentColumns.filter(
            (column) =>
                annotationNamesInDataSource.has(column.name) &&
                !annotations.find((a) => a.name === column.name)?.isParent
        );
        const columnNamesThatStillExist = columnsThatStillExist.map((column) => column.name);

        const newAnnotations = annotations.filter(
            (annotation) => !columnNamesThatStillExist.includes(annotation.name)
        );

        let columns: Column[] = [
            ...columnsThatStillExist,
            ...newAnnotations
                .filter((annotation) => !annotation.isParent)
                .map((annotation) => ({
                    name: annotation.name,
                    width: DEFAULT_COLUMN_WIDTH,
                })),
        ];

        // If there were no columns selected, default to displaying
        // "File Name" first for any data source
        if (!columnsThatStillExist.length) {
            // Remove filename annotations from columns before re-adding it at the front,
            columns = columns.filter((column) => column.name !== "File Name");

            // Add "File Name" back to the front of the columns array
            columns.unshift({
                name: "File Name",
                width: DEFAULT_COLUMN_WIDTH,
            });
        }

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

        // Index annotations by full dotted path (e.g. "Well.Column") for enriching active
        // filters below with schema-derived metadata. pathIsArray no longer needs enriching
        // here: it is the authoritative schema state on Annotation, looked up at SQL-generation
        // time (see resolvePathIsArray), not copied onto filters/sorts.
        const annotationByFullPath = new Map(
            annotations.map((annotation) => [annotation.name, annotation])
        );

        // Enrich active filters with annotationType and the correct path from the loaded
        // annotations (using annotationByFullPath defined above). This:
        //   (a) corrects filters decoded from legacy URLs with path=["Well.Column"] to the
        //       multi-element form ["Well","Column"], and
        //   (b) backfills valueType for any filter missing it.
        const enrichedFilters = currentFilters.map((filter) => {
            const annotation = annotationByFullPath.get(filter.name);
            // TODO: We should migrate annotation info out of filter so that
            // things like this are unnecessary - avoiding for now to conserve line changes
            if (!annotation) return filter; // no matching annotation — leave as-is

            const newType = annotation.type;

            // Return the same object if nothing would change, so the reference-equality
            // check below can correctly detect a no-op and skip the dispatch.
            const isPathUnchanged = annotation.name === filter.name;
            const isTypeUnchanged = newType === filter.valueType;
            if (isPathUnchanged && isTypeUnchanged) return filter;

            return new FileFilter(filter.name, filter.value, filter.type, newType);
        });

        // Only dispatch if at least one filter actually changed
        const hasChanges = enrichedFilters.some((f, i) => f !== currentFilters[i]);
        if (hasChanges) {
            dispatch(selection.actions.setFileFilters(enrichedFilters));
        }

        // Asynchronously compute optimal column widths and apply them to the (already-rendered)
        // columns once available. This intentionally does not block the dispatches above so the
        // file list renders immediately at the default width.
        const widthByAnnotation = await annotationService.fetchOptimalWidthForAnnotations(
            annotations
        );
        const resizedColumns = columns.map((column) => {
            const width = widthByAnnotation.get(column.name);
            return width === undefined ? column : { ...column, width };
        });
        dispatch(selection.actions.setColumns(resizedColumns));

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
