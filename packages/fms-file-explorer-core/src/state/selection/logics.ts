import { castArray, find, includes, isArray, isEmpty, map, reduce, uniq, without } from "lodash";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";

import {
    deselectFile,
    SELECT_FILE,
    REORDER_ANNOTATION_HIERARCHY,
    REMOVE_FROM_ANNOTATION_HIERARCHY,
    setAnnotationHierarchy,
} from "./actions";
import metadata from "../metadata";
import { getAnnotationHierarchy, getSelectedFiles } from "./selectors";
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
const selectFile = createLogic({
    transform(deps: ReduxLogicDeps, next: (action: AnyAction) => void) {
        const { action, getState } = deps;

        if (action.payload.updateExistingSelection) {
            const existingSelections = getSelectedFiles(getState());

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
const modifyAnnotationHierarchy = createLogic({
    transform(deps: ReduxLogicDeps, next, reject) {
        const { action, getState, ctx } = deps;

        const existingHierarchy = getAnnotationHierarchy(getState());
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

        // set nextHierarchy on ctx to share directly with the `process` hook
        ctx.hierarchy = nextHierarchy;
        next(setAnnotationHierarchy(nextHierarchy));
    },
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const {
            ctx: { hierarchy },
            httpClient,
            getState,
        } = deps;

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
        let iterationLevel = 0;
        const baseUrl = interaction.selectors.getFileExplorerServiceBaseUrl(getState());
        const fileService = new FileService({ baseUrl, httpClient });
        const [start] = hierarchyFilters;
        const nonEmpty = [];
        for (const filter of start) {
            const count = await fileService.getCountOfMatchingFiles(filter.toQueryString());
            if (count > 0) {
                nonEmpty.push(filter);
            }
        }
    },
    type: [REORDER_ANNOTATION_HIERARCHY, REMOVE_FROM_ANNOTATION_HIERARCHY],
});

export default [selectFile, modifyAnnotationHierarchy];
