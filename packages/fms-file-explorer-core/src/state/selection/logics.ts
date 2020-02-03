import {
    castArray,
    find,
    head,
    includes,
    isArray,
    isEmpty,
    map,
    reduce,
    uniq,
    without,
} from "lodash";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";

import {
    deselectFile,
    SELECT_FILE,
    REORDER_ANNOTATION_HIERARCHY,
    REMOVE_FROM_ANNOTATION_HIERARCHY,
    setAnnotationHierarchy,
    SET_ANNOTATION_HIERARCHY,
} from "./actions";
import metadata from "../metadata";
import * as selectionSelectors from "./selectors";
import { ReduxLogicDeps } from "../";
import interaction from "../interaction";
import Annotation from "../../entity/Annotation";
import FileFilter from "../../entity/FileFilter";
import FileSet from "../../entity/FileSet";
import FileService from "../../services/FileService";

/**
 * Interceptor responsible for transforming payload of SELECT_FILE actions to account for whether the intention is to
 * add to existing selected files state, to replace existing selection state, or to remove a file from the existing
 * selection state.
 */
const onSelectFile = createLogic({
    transform(deps: ReduxLogicDeps, next: (action: AnyAction) => void) {
        const { action, getState } = deps;

        if (action.payload.updateExistingSelection) {
            const existingSelections = selectionSelectors.getSelectedFiles(getState());

            // if updating existing selections and clicked file is already selected, interpret as a deselect action
            // ensure clicked file is not a list of files--that case is more difficult to guess user intention
            if (
                !isArray(action.payload.file) &&
                includes(existingSelections, action.payload.file)
            ) {
                next(deselectFile(action.payload.file));
            } else {
                next({
                    ...action,
                    payload: {
                        ...action.payload,
                        file: uniq([...existingSelections, ...castArray(action.payload.file)]),
                    },
                });
            }
        } else {
            next({
                ...action,
                payload: {
                    ...action.payload,
                    file: castArray(action.payload.file),
                },
            });
        }
    },
    type: SELECT_FILE,
});

/**
 * Interceptor responsible for transforming REORDER_ANNOTATION_HIERARCHY and REMOVE_FROM_ANNOTATION_HIERARCHY actions into
 * a concrete list of ordered annotations that can be directly stored in application state under `selections.annotationHierarchy`.
 */
const onModifyAnnotationHierarchy = createLogic({
    transform(deps: ReduxLogicDeps, next, reject) {
        const { action, getState, ctx } = deps;

        const existingHierarchy = selectionSelectors.getAnnotationHierarchy(getState());
        const allAnnotations = metadata.selectors.getAnnotations(getState());
        const annotation = find(
            allAnnotations,
            (annotation) => annotation.name === action.payload.id
        );

        if (annotation === undefined) {
            reject && reject(action); // reject is for some reason typed in react-logic as optional
            return;
        }

        let nextHierarchy: Annotation[];
        if (includes(existingHierarchy, annotation)) {
            const removed = without(existingHierarchy, annotation);
            if (action.payload.moveTo !== undefined) {
                // change order
                removed.splice(action.payload.moveTo, 0, annotation);
                nextHierarchy = removed;
            } else {
                // remove from list
                nextHierarchy = removed;
            }
        } else {
            // add to list
            nextHierarchy = Array.from(existingHierarchy);
            nextHierarchy.splice(action.payload.moveTo, 0, annotation);
        }

        next(setAnnotationHierarchy(nextHierarchy));
    },
    type: [REORDER_ANNOTATION_HIERARCHY, REMOVE_FROM_ANNOTATION_HIERARCHY],
});

/**
 * Interceptor responsible for creating groupings of files to be displayed by the DirectoryTree.
 */
const onSetAnnotationHierarchy = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { httpClient, getState } = deps;

        // pull stuff out of the store that we'll need
        const appState = getState();
        const hierarchy = selectionSelectors.getAnnotationHierarchy(appState);
        const baseUrl = interaction.selectors.getFileExplorerServiceBaseUrl(appState);

        //
        // [
        //   [FileFilter("A", 1), FileFilter("A", 2), FileFilter("A", 3)],
        //   [FileFilter("B", true), FileFilter("B", false)],
        //   [FileFilter("C", "foo"), FileFilter("C", "bar"), FileFilter("C", "baz")]
        // ]
        const hierarchyFilters = reduce(
            hierarchy,
            (accum, annotation) => {
                // only include those annotations that we have values for
                if (!isEmpty(annotation.values)) {
                    const filters = map(
                        annotation.values,
                        (val) => new FileFilter(annotation.name, val)
                    );
                    accum.push(filters);
                    return accum;
                }

                return accum;
            },
            [] as FileFilter[][]
        );

        // Iterate over fileFilters depth-first, making combination FileSets and determining if the set is empty
        const hierarchyDepth = hierarchyFilters.length;
        const fileService = new FileService({ baseUrl, httpClient });

        async function fileSetIsEmpty(fileSet: FileSet) {
            const qs = fileSet.toQueryString();
            const count = await fileService.getCountOfMatchingFiles(qs);
            return count < 1;
        }

        async function constructFileSetTrees(
            root: FileSet[],
            filters: FileFilter[],
            depth: number
        ) {
            return await hierarchyFilters[depth].reduce(
                async (constructionOfOlderSiblingFileSetTrees, currentFilter) => {
                    const fileSets = await constructionOfOlderSiblingFileSetTrees;
                    return [
                        ...fileSets,
                        ...(await constructFileSetTreeBranch([...filters, currentFilter], depth)),
                    ];
                },
                Promise.resolve(root)
            );
        }

        async function constructFileSetTreeBranch(
            accumulatedFileFilters: FileFilter[],
            depth: number
        ): Promise<FileSet[]> {
            const output: FileSet[] = [];
            const filters = [...accumulatedFileFilters];
            const fileSet = new FileSet({ filters, fileService });
            const nextDepth = depth + 1;

            if (await fileSetIsEmpty(fileSet)) {
                return output;
            }

            if (hierarchyDepth > nextDepth) {
                output.push(fileSet);
            } else {
                output.push(fileSet);
                return output;
            }

            return await constructFileSetTrees(output, filters, nextDepth);
        }

        const fileSetTree = await constructFileSetTrees([] as FileSet[], [], 0);

        console.log(JSON.stringify(fileSetTree, null, 2));

        done();
    },
    type: SET_ANNOTATION_HIERARCHY,
});

export default [onSelectFile, onModifyAnnotationHierarchy, onSetAnnotationHierarchy];
