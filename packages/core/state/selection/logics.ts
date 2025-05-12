import { castArray, find, sortBy, uniqWith } from "lodash";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";
import { batch } from "react-redux";

import {
    ADD_FILE_FILTER,
    SELECT_FILE,
    REORDER_ANNOTATION_HIERARCHY,
    REMOVE_FILE_FILTER,
    REMOVE_FROM_ANNOTATION_HIERARCHY,
    SelectFileAction,
    setAnnotationHierarchy,
    setAvailableAnnotations,
    setFileFilters,
    setFileSelection,
    TOGGLE_FILE_FOLDER_COLLAPSE,
    setOpenFileFolders,
    DECODE_FILE_EXPLORER_URL,
    SET_ANNOTATION_HIERARCHY,
    SELECT_NEARBY_FILE,
    setSortColumn,
    CHANGE_QUERY,
    SetAnnotationHierarchyAction,
    RemoveFromAnnotationHierarchyAction,
    ReorderAnnotationHierarchyAction,
    decodeSearchParams,
    ADD_QUERY,
    AddQuery,
    changeQuery,
    ChangeQuery,
    setQueries,
    REPLACE_DATA_SOURCE,
    ReplaceDataSource,
    REMOVE_QUERY,
    changeDataSources,
    ChangeDataSourcesAction,
    CHANGE_DATA_SOURCES,
    CHANGE_SOURCE_METADATA,
    ChangeSourceMetadataAction,
    changeSourceMetadata,
    setRequiresDataSourceReload,
    addDataSourceReloadError,
    removeDataSourceReloadError,
    ADD_DATASOURCE_RELOAD_ERROR,
    REMOVE_DATASOURCE_RELOAD_ERROR,
    CHANGE_FILE_FILTER_TYPE,
    AddDataSourceReloadError,
    setFileView,
    setColumns,
    EXPAND_ALL_FILE_FOLDERS,
    toggleNullValueGroups,
} from "./actions";
import { interaction, metadata, ReduxLogicDeps, selection } from "../";
import * as selectionSelectors from "./selectors";
import { findChildNodes } from "../../components/DirectoryTree/findChildNodes";
import { NO_VALUE_NODE, ROOT_NODE } from "../../components/DirectoryTree/directory-hierarchy-state";
import Annotation from "../../entity/Annotation";
import SearchParams from "../../entity/SearchParams";
import FileFilter, { FilterType } from "../../entity/FileFilter";
import FileFolder from "../../entity/FileFolder";
import FileSelection from "../../entity/FileSelection";
import FileSet from "../../entity/FileSet";
import { AnnotationValue } from "../../services/AnnotationService";
import HttpAnnotationService from "../../services/AnnotationService/HttpAnnotationService";
import { DataSource } from "../../services/DataSourceService";
import DataSourcePreparationError from "../../errors/DataSourcePreparationError";

/**
 * Interceptor responsible for transforming payload of SELECT_FILE actions to account for whether the intention is to
 * add to existing selected files state, to replace existing selection state, or to remove a file from the existing
 * selection state.
 */
const selectFile = createLogic({
    transform(deps: ReduxLogicDeps, next: (action: AnyAction) => void) {
        const { getState } = deps;
        const {
            payload: { fileSet, lastTouched, selection, sortOrder, updateExistingSelection },
        } = deps.action as SelectFileAction;
        const existingFileSelections = selectionSelectors.getFileSelection(getState());

        if (updateExistingSelection) {
            if (existingFileSelections.isSelected(fileSet, selection)) {
                const nextFileSelection = existingFileSelections.deselect(fileSet, selection);
                next(setFileSelection(nextFileSelection));
                return;
            } else {
                const nextFileSelection = existingFileSelections.select({
                    fileSet,
                    index: selection,
                    sortOrder,
                    indexToFocus: lastTouched,
                });
                next(setFileSelection(nextFileSelection));
                return;
            }
        }

        // special case: fast path for deselecting a file if it is the only one selected
        // (no need to have held down keyboard modifier)
        if (
            existingFileSelections.count() === 1 &&
            existingFileSelections.isSelected(fileSet, selection)
        ) {
            next(setFileSelection(new FileSelection()));
            return;
        }

        const nextFileSelection = new FileSelection().select({
            fileSet,
            index: selection,
            sortOrder,
            indexToFocus: lastTouched,
        });
        next(setFileSelection(nextFileSelection));
    },
    type: SELECT_FILE,
});

/**
 * Interceptor responsible for transforming REORDER_ANNOTATION_HIERARCHY and REMOVE_FROM_ANNOTATION_HIERARCHY actions into
 * a concrete list of ordered annotations that can be directly stored in application state under `selections.annotationHierarchy`.
 */
const modifyAnnotationHierarchy = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { action, getState, ctx } = deps;
        const { payload: currentHierarchy } = action as SetAnnotationHierarchyAction;
        const existingHierarchy = ctx.existingHierarchy as string[];
        const originalPayload = ctx.originalAction.payload;

        const existingOpenFileFolders = selectionSelectors.getOpenFileFolders(getState());

        let openFileFolders: FileFolder[];
        if (existingHierarchy.length > currentHierarchy.length) {
            // Determine which index the remove occurred
            const indexOfRemoval = existingHierarchy.findIndex((a) => a === originalPayload.id);

            // Determine the new folders now that an annotation has been removed
            // removing any that can't be used anymore
            openFileFolders = existingOpenFileFolders
                .map((ff) => ff.removeAnnotationAtIndex(indexOfRemoval))
                .filter((ff) => !ff.isEmpty());
        } else if (existingHierarchy.length < currentHierarchy.length) {
            // Determine the new folders now that an annotation has been added
            // removing any that can't be used anymore
            openFileFolders = existingOpenFileFolders
                .map((ff) => ff.addAnnotationAtIndex(originalPayload.moveTo))
                .filter((ff) => !ff.isEmpty());
        } else {
            // Get mapping of old annotation locations to new annotation locations in the hierarchy
            const annotationIndexMap = currentHierarchy.reduce(
                (map, currentAnnotation, newIndex) => ({
                    ...map,
                    [newIndex]: existingHierarchy.findIndex((a) => a === currentAnnotation),
                }),
                {}
            );

            // Use annotation index mapping to re-order annotation values in file folders
            openFileFolders = existingOpenFileFolders.reduce(
                (openFolders: FileFolder[], fileFolder) => [
                    ...openFolders,
                    ...fileFolder.reorderAnnotations(annotationIndexMap),
                ],
                []
            );
        }
        dispatch(setOpenFileFolders(uniqWith(openFileFolders, (f1, f2) => f1.equals(f2))));

        done();
    },
    transform(deps: ReduxLogicDeps, next) {
        const { action, getState, ctx } = deps;
        const {
            payload: { id: modifiedAnnotationName },
        } = action as ReorderAnnotationHierarchyAction | RemoveFromAnnotationHierarchyAction;

        const existingHierarchy = selectionSelectors.getAnnotationHierarchy(getState());
        ctx.existingHierarchy = existingHierarchy;
        ctx.originalAction = action as
            | RemoveFromAnnotationHierarchyAction
            | ReorderAnnotationHierarchyAction;

        let nextHierarchy: string[];
        if (find(existingHierarchy, (a) => a === modifiedAnnotationName)) {
            const removed = existingHierarchy.filter((a) => a !== modifiedAnnotationName);

            // if moveTo is defined, change the order
            // otherwise, remove it from the hierarchy
            if (action.payload.moveTo !== undefined) {
                // change order
                removed.splice(action.payload.moveTo, 0, modifiedAnnotationName);
            }

            nextHierarchy = removed;
        } else {
            // add to list
            nextHierarchy = Array.from(existingHierarchy);
            nextHierarchy.splice(action.payload.moveTo, 0, modifiedAnnotationName);
        }

        next(setAnnotationHierarchy(nextHierarchy));
    },
    type: [REORDER_ANNOTATION_HIERARCHY, REMOVE_FROM_ANNOTATION_HIERARCHY],
});

const setAvailableAnnotationsLogic = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { action, httpClient, getState } = deps;
        const { payload: annotationHierarchy } = action as SetAnnotationHierarchyAction;
        const annotationService = interaction.selectors.getAnnotationService(getState());
        const applicationVersion = interaction.selectors.getApplicationVersion(getState());
        if (annotationService instanceof HttpAnnotationService) {
            if (applicationVersion) {
                annotationService.setApplicationVersion(applicationVersion);
            }
            annotationService.setHttpClient(httpClient);
        }

        try {
            dispatch(
                setAvailableAnnotations(
                    await annotationService.fetchAvailableAnnotationsForHierarchy(
                        annotationHierarchy
                    )
                )
            );
        } catch (err) {
            console.error(
                "Something went wrong finding available annotations, nobody knows why. But here's a hint:",
                err
            );
            const annotations = metadata.selectors.getAnnotations(getState());
            dispatch(setAvailableAnnotations(annotations.map((a: Annotation) => a.name)));
        } finally {
            done();
        }
    },
    type: [SET_ANNOTATION_HIERARCHY],
});

/**
 * Interceptor responsible for transforming ADD_FILE_FILTER, REMOVE_FILE_FILTER, and CHANGE_FILE_FILTER_TYPE
 * actions into a concrete list of ordered FileFilters that can be stored directly in
 * application state under `selections.filters`.
 */
const modifyFileFilters = createLogic({
    transform(deps: ReduxLogicDeps, next, reject) {
        const { action, getState } = deps;

        const previousFilters = selectionSelectors.getFileFilters(getState());
        let nextFilters: FileFilter[];

        if (action.type === CHANGE_FILE_FILTER_TYPE) {
            switch (action.payload.type) {
                // For include/exclude, remove all previous filters for this annotation
                // and replace with a new single filter
                case FilterType.ANY:
                case FilterType.EXCLUDE:
                    const newFilter = new FileFilter(
                        action.payload.annotationName,
                        "",
                        action.payload.type
                    );
                    nextFilters = [
                        ...previousFilters.filter(
                            (filter) => filter.name !== action.payload.annotationName
                        ),
                        newFilter,
                    ];
                    break;
                // For default/fuzzy, toggle the type for existing default/fuzzy filters but keep their value,
                // and fully remove include/exclude filters
                case FilterType.FUZZY:
                default:
                    nextFilters = previousFilters
                        .filter((filter) => {
                            return !(
                                filter.name === action.payload.annotationName &&
                                (filter.type === FilterType.ANY ||
                                    filter.type === FilterType.EXCLUDE)
                            );
                        })
                        .map((filter) => {
                            if (filter.name === action.payload.annotationName) {
                                filter.type = action.payload.type;
                            }
                            return filter;
                        });
            }
        } else {
            const incomingFilters = castArray(action.payload);
            if (action.type === ADD_FILE_FILTER) {
                nextFilters = uniqWith(
                    [...previousFilters, ...incomingFilters],
                    (existing, incoming) => {
                        return existing.equals(incoming);
                    }
                );
            } else {
                nextFilters = previousFilters.filter((existing) => {
                    return !incomingFilters.some((incoming) => incoming.equals(existing));
                });
            }
        }

        const sortedNextFilters = sortBy(nextFilters, ["name", "value"]);

        const filtersAreUnchanged =
            previousFilters.length === sortedNextFilters.length &&
            previousFilters.every((existing) =>
                sortedNextFilters.some((incoming) => incoming.equals(existing))
            );

        if (filtersAreUnchanged) {
            reject && reject(action);
            return;
        }

        next(setFileFilters(sortedNextFilters));
    },
    type: [ADD_FILE_FILTER, REMOVE_FILE_FILTER, CHANGE_FILE_FILTER_TYPE],
});

/**
 * Interceptor responsible for transforming TOGGLE_FILE_FOLDER_COLLAPSE actions into
 * SET_OPEN_FILE_FOLDERS actions by determining whether the file folder is to be considered
 * open or collapsed.
 */
const toggleFileFolderCollapse = createLogic({
    transform(deps: ReduxLogicDeps, next) {
        const fileFolder: FileFolder = deps.action.payload;
        const openFileFolders = selectionSelectors.getOpenFileFolders(deps.getState());
        // If the file folder is already open, collapse it by removing it
        if (openFileFolders.find((f) => f.equals(fileFolder))) {
            next(
                setOpenFileFolders(
                    openFileFolders.filter((f) => !f.includesSubFileFolder(fileFolder))
                )
            );
        } else {
            next(setOpenFileFolders([...openFileFolders, fileFolder]));
        }
    },
    type: [TOGGLE_FILE_FOLDER_COLLAPSE],
});

/**
 * Interceptor responsible for transforming COLLAPSE_ALL_FILE_FOLDERS and EXPAND_ALL_FILE_FOLDERS
 * actions into SET_OPEN_FILE_FOLDERS actions by either setting to none or recursively
 * unpacking the directory structure
 */
const expandAllFileFolders = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { getState } = deps;
        const hierarchy = selection.selectors.getAnnotationHierarchy(getState());
        const annotationService = interaction.selectors.getAnnotationService(getState());
        const globalFileFilters = selection.selectors.getFileFilters(getState());
        const shouldShowNullGroups = selection.selectors.getShouldShowNullGroups(getState());
        const fileService = interaction.selectors.getFileService(getState());
        const fileSet = new FileSet({
            fileService,
            filters: globalFileFilters,
        });
        // Track internally rather than relying on selector (may be out of sync)
        const openedSoFar: FileFolder[] = [];
        // Recursive helper
        async function unpackAllFileFolders(values: string[], pathSoFar: string[]) {
            const fileFoldersToOpen: FileFolder[] = values.map(
                (value) => new FileFolder([...pathSoFar, value] as AnnotationValue[])
            );
            // Needs to be set wholesale so must include already opened folders
            openedSoFar.push(...fileFoldersToOpen);
            dispatch(setOpenFileFolders(openedSoFar));
            for (const value of values) {
                // At end of folder hierarchy
                if (!!hierarchy.length && pathSoFar.length === hierarchy.length - 1) continue;

                const childNodes = await findChildNodes({
                    ancestorNodes: pathSoFar,
                    currentNode: value,
                    fileSet,
                    hierarchy,
                    annotationService,
                    fileService,
                    shouldShowNullGroups,
                });
                if (childNodes.length) {
                    // Not a leaf
                    unpackAllFileFolders(childNodes, [...pathSoFar, value]);
                }
            }
        }

        const rootHierarchyValues = await findChildNodes({
            currentNode: ROOT_NODE,
            fileSet,
            hierarchy,
            annotationService,
            fileService,
            shouldShowNullGroups,
        });
        if (shouldShowNullGroups) {
            rootHierarchyValues.push(NO_VALUE_NODE);
        }
        await unpackAllFileFolders(rootHierarchyValues, []);
        dispatch(interaction.actions.refresh() as AnyAction); // synchronize UI with state
        done();
    },
    type: [EXPAND_ALL_FILE_FOLDERS],
});

/**
 * Interceptor responsible for processing DECODE_FILE_EXPLORER_URL actions into various
 * other actions responsible for rehydrating the SearchParams into application state.
 */
const decodeSearchParamsLogics = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const encodedURL = deps.action.payload;
        const {
            columns,
            hierarchy,
            fileView,
            filters,
            openFolders,
            showNoValueGroups,
            sortColumn,
            sources,
            sourceMetadata,
        } = SearchParams.decode(encodedURL);

        batch(() => {
            dispatch(changeSourceMetadata(sourceMetadata));
            dispatch(changeDataSources(sources));
            dispatch(setAnnotationHierarchy(hierarchy));
            columns && dispatch(setColumns(columns));
            dispatch(setFileFilters(filters));
            fileView && dispatch(setFileView(fileView) as AnyAction);
            dispatch(setOpenFileFolders(openFolders));
            dispatch(setSortColumn(sortColumn));
            dispatch(toggleNullValueGroups(showNoValueGroups) as AnyAction);
        });
        done();
    },
    type: [DECODE_FILE_EXPLORER_URL],
});

/**
 * Interceptor responsible for processing SELECT_NEARBY_FILE actions into SET_FILE_SELECTION actions.
 */
const selectNearbyFile = createLogic({
    async transform(deps: ReduxLogicDeps, next, reject) {
        const { direction, updateExistingSelection } = deps.action.payload;
        const fileService = interaction.selectors.getFileService(deps.getState());
        const fileSelection = selectionSelectors.getFileSelection(deps.getState());
        const hierarchy = selectionSelectors.getAnnotationHierarchy(deps.getState());
        const openFileFolders = selectionSelectors.getOpenFileFolders(deps.getState());
        const sortColumn = selectionSelectors.getSortColumn(deps.getState());

        const openFileListPaths = openFileFolders.filter(
            (fileFolder) => fileFolder.size() === hierarchy.length
        );
        const sortedOpenFileListPaths = FileFolder.sort(openFileListPaths);

        const currentFocusedItem = fileSelection.focusedItem;
        // No-op no files are currently focused so no jumping off point to navigate from
        if (!currentFocusedItem) {
            reject && reject(deps.action);
            return;
        }

        // Determine the file folder the current focused item is in as well as the relative
        // position of the file list compared to the other open file lists
        const fileFolderForCurrentFocusedItem = new FileFolder(
            currentFocusedItem.fileSet.filters.map((filter) => filter.value)
        );
        const indexOfFocusedFileList = sortedOpenFileListPaths.findIndex((fileFolder) =>
            fileFolder.equals(fileFolderForCurrentFocusedItem)
        );

        // If not updating the existing selection start from scratch
        let newFileSelection = updateExistingSelection ? fileSelection : new FileSelection();

        // If the direction specified is "up" move to the file one row above the currently
        // focused one. If already at the top of the file list navigate to the bottom of the next open
        // file list above the current one. If already at the top file list and top file for that file list
        // no operation is performed.
        if (direction === "up") {
            const indexAboveCurrentFileSetIndex = currentFocusedItem.indexWithinFileSet - 1;
            if (indexAboveCurrentFileSetIndex >= 0) {
                // If not at the top of the current file list navigate one row up
                newFileSelection = newFileSelection.select({
                    index: indexAboveCurrentFileSetIndex,
                    fileSet: currentFocusedItem.fileSet,
                    sortOrder: currentFocusedItem.sortOrder,
                });
            } else if (indexOfFocusedFileList > 0) {
                // If not at the top file list (but at the top of this file list) navigate
                // to the bottom of the next open file list above this one
                const fileListIndexAboveCurrentFileList = indexOfFocusedFileList - 1;
                const openFileSetAboveCurrent = new FileSet({
                    fileService,
                    // Determine the filters of the previous file list based on the hierarchy & path
                    // needed to open the file folder
                    filters: sortedOpenFileListPaths[
                        fileListIndexAboveCurrentFileList
                    ].fileFolder.map(
                        (filterValue, index) => new FileFilter(hierarchy[index], filterValue)
                    ),
                    sort: sortColumn,
                });
                const totalFileSetSize = await openFileSetAboveCurrent.fetchTotalCount();
                newFileSelection = newFileSelection.select({
                    index: totalFileSetSize - 1,
                    fileSet: openFileSetAboveCurrent,
                    sortOrder: currentFocusedItem.sortOrder,
                });
            } else {
                // No-op no file above to navigate to
                reject && reject(deps.action);
                return;
            }
        } else {
            // direction === "down"
            const indexBelowCurrentFileSetIndex = currentFocusedItem.indexWithinFileSet + 1;
            const fileListIndexBelowCurrentFileList = indexOfFocusedFileList + 1;
            const totalFileSetSize = await currentFocusedItem.fileSet.fetchTotalCount();
            if (indexBelowCurrentFileSetIndex < totalFileSetSize) {
                // If not at the bottom of the current file list navigate one row down
                newFileSelection = newFileSelection.select({
                    index: indexBelowCurrentFileSetIndex,
                    fileSet: currentFocusedItem.fileSet,
                    sortOrder: currentFocusedItem.sortOrder,
                });
            } else if (fileListIndexBelowCurrentFileList < sortedOpenFileListPaths.length) {
                // If not at the bottom file list (but at the bottom of this file list) navigate
                // to the top of the next open file list below this one
                const openFileSetBelowCurrent = new FileSet({
                    fileService,
                    // Determine the filters of the next file list based on the hierarchy & path
                    // needed to open the file folder
                    filters: sortedOpenFileListPaths[
                        fileListIndexBelowCurrentFileList
                    ].fileFolder.map(
                        (filterValue, index) => new FileFilter(hierarchy[index], filterValue)
                    ),
                    sort: sortColumn,
                });
                newFileSelection = newFileSelection.select({
                    index: 0,
                    fileSet: openFileSetBelowCurrent,
                    sortOrder: currentFocusedItem.sortOrder,
                });
            } else {
                // No-op no file below to navigate to
                reject && reject(deps.action);
                return;
            }
        }
        next(selection.actions.setFileSelection(newFileSelection));
    },
    type: [SELECT_NEARBY_FILE],
});

/**
 * Interceptor responsible for processing a new data source into
 * a refresh action so that the resources pertain to the current data source
 */
const changeDataSourceLogic = createLogic({
    type: CHANGE_DATA_SOURCES,
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { payload: selectedDataSources } = deps.action as ChangeDataSourcesAction;
        const dataSources = interaction.selectors.getAllDataSources(deps.getState());
        const { databaseService } = interaction.selectors.getPlatformDependentServices(
            deps.getState()
        );
        const statuses = interaction.selectors.getProcessStatuses(deps.getState());
        const dataSourceErrorStatus = statuses.find(
            (status) => status.processId === "dataSourceReloadError"
        );

        const newSelectedDataSources: DataSource[] = [];
        const existingSelectedDataSources: DataSource[] = [];
        selectedDataSources.forEach((source) => {
            const existingSource = dataSources.find((s) => s.name === source.name);
            if (existingSource) {
                existingSelectedDataSources.push(existingSource);
            } else {
                newSelectedDataSources.push({ ...source, id: source.name });
            }
        });

        // It is possible the user was sent a novel data source in the URL
        if (selectedDataSources.length > existingSelectedDataSources.length) {
            dispatch(
                metadata.actions.receiveDataSources([...dataSources, ...newSelectedDataSources])
            );
        }

        // Prepare the data sources ahead of querying against them below
        try {
            await databaseService.prepareDataSources(selectedDataSources);
            // Hide warning pop-up if present and remove datasource error from state
            dispatch(removeDataSourceReloadError());
        } catch (err) {
            const errMsg = (err as Error).message || "Unknown error while changing data source";
            if (err instanceof DataSourcePreparationError) {
                // Avoid re-appending the same error message to the state,
                // the original may have been more specific
                if (!dataSourceErrorStatus?.data.msg.includes(err.sourceName)) {
                    dispatch(addDataSourceReloadError(err.sourceName, errMsg) as AnyAction);
                }
            } else {
                dispatch(interaction.actions.processError("dataSourcePreparationError", errMsg));
            }
        }

        dispatch(interaction.actions.refresh() as AnyAction);
        done();
    },
});

/**
 * Interceptor responsible for processing changed source metadata events into
 * actual reads from the source file
 */
const changeSourceMetadataLogic = createLogic({
    type: CHANGE_SOURCE_METADATA,
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { payload: selectedSourceMetadata } = deps.action as ChangeSourceMetadataAction;
        const { databaseService } = interaction.selectors.getPlatformDependentServices(
            deps.getState()
        );
        if (selectedSourceMetadata) {
            await databaseService.prepareSourceMetadata(selectedSourceMetadata);
        } else {
            await databaseService.deleteSourceMetadata();
        }

        dispatch(metadata.actions.requestAnnotations());
        done();
    },
});

/**
 * Interceptor responsible for processing the added query to accurate/unique names
 */
const addQueryLogic = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { payload: newQuery } = deps.action as AddQuery;
        const { databaseService } = interaction.selectors.getPlatformDependentServices(
            deps.getState()
        );

        // Prepare the data sources ahead of querying against them below
        try {
            await databaseService.prepareDataSources(newQuery.parts.sources);
            if (newQuery.parts.sourceMetadata) {
                await databaseService.prepareSourceMetadata(newQuery.parts.sourceMetadata);
            } else {
                await databaseService.deleteSourceMetadata();
            }
            // Hide warning pop-up if present and remove datasource error from state
            dispatch(removeDataSourceReloadError());
        } catch (err) {
            const errMsg = (err as Error).message || "Unknown error while adding query";
            console.error(errMsg);
            if (err instanceof DataSourcePreparationError) {
                dispatch(addDataSourceReloadError(err.sourceName, errMsg) as AnyAction);
            } else {
                dispatch(interaction.actions.processError("dataSourcePreparationError", errMsg));
            }
        }

        dispatch(changeQuery(deps.action.payload));
        done();
    },
    transform(deps: ReduxLogicDeps, next) {
        const queries = selectionSelectors.getQueries(deps.getState());
        const { payload: newQuery } = deps.action as AddQuery;
        // Map the query names to their occurrences so that queries with the same name
        // have their occurences appended to their name to make them unique
        const queryNameToOccurrence = queries.reduce((acc, query) => {
            const nameWithoutOccurence = query.name.replace(/ \(\d+\)$/, "");
            return { ...acc, [nameWithoutOccurence]: (acc[nameWithoutOccurence] || 0) + 1 };
        }, {} as Record<string, number>);

        const newQueryName = newQuery.name.replace(/ \(\d+\)$/, "");
        next({
            ...deps.action,
            payload: {
                ...newQuery,
                name: queryNameToOccurrence[newQueryName]
                    ? `${newQueryName} (${queryNameToOccurrence[newQueryName]})`
                    : newQueryName,
            },
        });
    },
    type: ADD_QUERY,
});

/**
 * Interceptor responsible for processing the changed query into
 * a decoded URL
 */
const changeQueryLogic = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { payload: newlySelectedQuery } = deps.action as ChangeQuery;
        const currentQueries = selectionSelectors.getQueries(deps.getState());
        const currentQueryParts = selectionSelectors.getCurrentQueryParts(deps.getState());
        const updatedQueries = currentQueries.map((query) => ({
            ...query,
            parts:
                query.name === deps.ctx.previouslySelectedQueryName
                    ? currentQueryParts
                    : query.parts,
        }));

        if (newlySelectedQuery) {
            dispatch(
                decodeSearchParams(SearchParams.encode(newlySelectedQuery.parts)) as AnyAction
            );
        }
        dispatch(setQueries(updatedQueries));
        done();
    },
    transform(deps: ReduxLogicDeps, next) {
        deps.ctx.previouslySelectedQueryName = selectionSelectors.getSelectedQuery(deps.getState());
        next(deps.action);
    },
    type: CHANGE_QUERY,
});

const removeQueryLogic = createLogic({
    type: REMOVE_QUERY,
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const queries = selectionSelectors.getQueries(deps.getState());
        // If removing the last query, must also remove the query params from the URL
        if (queries.length === 0) {
            const emptySearchParamUrl = window.location.toString().split("?")[0];
            window.history.pushState({ path: emptySearchParamUrl }, "", emptySearchParamUrl);
        }
        dispatch(changeQuery(queries[0]));
        done();
    },
});

const replaceDataSourceLogic = createLogic({
    type: REPLACE_DATA_SOURCE,
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { payload: replacementSource } = deps.ctx
            .replaceDataSourceAction as ReplaceDataSource;
        const { databaseService } = interaction.selectors.getPlatformDependentServices(
            deps.getState()
        );

        // Prepare the data sources ahead of querying against them below
        try {
            await databaseService.prepareDataSources([replacementSource]);
            // Hide warning pop-up if present and remove datasource error from state
            dispatch(removeDataSourceReloadError());
        } catch (err) {
            const errMsg = (err as Error).message || "Unknown error while replacing data source";
            console.error(errMsg);
            if (err instanceof DataSourcePreparationError) {
                dispatch(addDataSourceReloadError(err.sourceName, errMsg) as AnyAction);
            } else {
                dispatch(interaction.actions.processError("dataSourcePreparationError", errMsg));
            }
        }

        dispatch(interaction.actions.refresh() as AnyAction);
        done();
    },
    transform(deps: ReduxLogicDeps, next) {
        const { payload: replacementDataSource } = deps.action as ReplaceDataSource;
        deps.ctx.replaceDataSourceAction = deps.action;
        const queries = selectionSelectors.getQueries(deps.getState());
        const updatedQueries = queries.map((query) => {
            if (query.parts.sources[0]?.name !== replacementDataSource.name) {
                return query;
            }

            return {
                ...query,
                parts: {
                    ...query.parts,
                    source: replacementDataSource,
                },
            };
        });
        next(selection.actions.setQueries(updatedQueries));
    },
});

// Logic for adding and removing data source reload errors
// If adding, renders a pop-up to notify user that a datasource couldn't be loaded sets bool to true
// If removing, hides pop-up (if there is one) and unsets bool
const setDataSourceReloadErrorLogic = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const isNewError = deps.action.type === ADD_DATASOURCE_RELOAD_ERROR;
        if (isNewError) {
            const {
                payload: { dataSourceName, error },
            } = deps.action as AddDataSourceReloadError;
            const datasourceErrorDefaultMessage = `
                The following error occurred while loading the data source
                &quot;${dataSourceName}&quot;:
                </br>
                </br>
                ${error}
                </br>
                </br>
                Please re-select the data source or a replacement.
            `;
            dispatch(
                interaction.actions.processError(
                    "dataSourceReloadError",
                    datasourceErrorDefaultMessage
                )
            );
        } else dispatch(interaction.actions.removeStatus("dataSourceReloadError"));
        dispatch(setRequiresDataSourceReload(isNewError) as AnyAction);
        done();
    },
    type: [ADD_DATASOURCE_RELOAD_ERROR, REMOVE_DATASOURCE_RELOAD_ERROR],
});

export default [
    selectFile,
    modifyAnnotationHierarchy,
    modifyFileFilters,
    toggleFileFolderCollapse,
    expandAllFileFolders,
    decodeSearchParamsLogics,
    selectNearbyFile,
    setAvailableAnnotationsLogic,
    changeDataSourceLogic,
    changeSourceMetadataLogic,
    addQueryLogic,
    replaceDataSourceLogic,
    setDataSourceReloadErrorLogic,
    changeQueryLogic,
    removeQueryLogic,
];
