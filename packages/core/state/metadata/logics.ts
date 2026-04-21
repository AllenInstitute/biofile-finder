import { createLogic } from "redux-logic";

import { interaction, metadata, ReduxLogicDeps, selection } from "..";
import {
    CREATE_ANNOTATION,
    CreateAnnotationAction,
    RECEIVE_ANNOTATIONS,
    ReceiveAnnotationAction,
    receiveAnnotations,
    REQUEST_ANNOTATIONS,
    STORE_NEW_ANNOTATION,
    storeNewAnnotation,
    StoreNewAnnotationAction,
} from "./actions";
import Annotation, { AnnotationResponseMms } from "../../entity/Annotation";
import AnnotationName from "../../entity/Annotation/AnnotationName";
import { AnnotationType, AnnotationTypeIdMap } from "../../entity/AnnotationFormatter";
import FileFilter from "../../entity/FileFilter";
import FileSort, { SortOrder } from "../../entity/FileSort";

const requestAnnotations = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const annotationService = interaction.selectors.getAnnotationService(deps.getState());
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

const receiveAnnotationsLogic = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const actions = deps.action as ReceiveAnnotationAction;
        const annotations = actions.payload;
        const currentSortColumn = selection.selectors.getSortColumn(deps.getState());
        const currentColumns = selection.selectors.getColumns(deps.getState());
        const currentFilters = selection.selectors.getFileFilters(deps.getState());

        const annotationNamesInDataSource = annotations.reduce(
            (set, annotation) => set.add(annotation.name),
            new Set<string>()
        );
        const columnsThatStillExist = currentColumns.filter((column) =>
            annotationNamesInDataSource.has(column.name)
        );
        const columnNamesThatStillExist = columnsThatStillExist.map((column) => column.name);

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
            dispatch(selection.actions.setSortColumn());
        }

        const annotationTypeByName = new Map(
            annotations.map((annotation) => [annotation.name, annotation.type as AnnotationType])
        );
        const enrichedFilters = currentFilters.map((filter) =>
            filter.annotationType
                ? filter
                : new FileFilter(
                      filter.name,
                      filter.value,
                      filter.type,
                      annotationTypeByName.get(filter.name)
                  )
        );
        const hasEnrichedFilters = enrichedFilters.some(
            (filter, i) => filter !== currentFilters[i]
        );
        if (hasEnrichedFilters) {
            dispatch(selection.actions.setFileFilters(enrichedFilters));
        }

        done();
    },
    type: RECEIVE_ANNOTATIONS,
});

const createNewAnnotationLogic = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const {
            payload: { annotation, annotationOptions, user },
        } = deps.action as CreateAnnotationAction;
        const annotationProcessId = annotation.name;
        dispatch(
            interaction.actions.processStart(
                annotationProcessId,
                `Creating new field "${annotation.name}"...`
            )
        );

        const annotationService = interaction.selectors.getAnnotationService(deps.getState());
        try {
            const res = (await annotationService.createAnnotation(
                annotation,
                annotationOptions,
                user
            )) as AnnotationResponseMms[] | void;
            if (res?.[0]?.annotationId) {
                dispatch(storeNewAnnotation(res[0]));
            }
            dispatch(
                interaction.actions.processSuccess(
                    annotationProcessId,
                    `Successfully created new field "${annotation.name}"`
                )
            );
        } catch (err) {
            const msg = `Sorry, creation of field name/key "${annotation.name}" failed${
                (err as Error)?.message ? `: ${(err as Error).message}` : "."
            }`;
            dispatch(interaction.actions.processError(annotationProcessId, msg));
        } finally {
            done();
        }
    },
    type: CREATE_ANNOTATION,
});

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

// AnnotationName import kept for possible reintroduction, silence unused warning.
void AnnotationName;
void FileSort;
void SortOrder;

export default [
    createNewAnnotationLogic,
    requestAnnotations,
    receiveAnnotationsLogic,
    storeNewAnnotationLogic,
];
