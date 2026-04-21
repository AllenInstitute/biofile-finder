import { createLogic } from "redux-logic";

import { metadata, ReduxLogicDeps, selection } from "../";
import {
    REFRESH,
    SET_IS_SMALL_SCREEN,
    SetIsSmallScreenAction,
    SHOW_CONTEXT_MENU,
    hideVisibleModal,
    setVisibleModal,
} from "./actions";
import * as interactionSelectors from "./selectors";
import { ModalType } from "../../components/Modal";

/**
 * Interceptor responsible for ensuring any previously-registered onDismiss
 * callback is invoked before a new context menu replaces it.
 */
const showContextMenu = createLogic({
    type: SHOW_CONTEXT_MENU,
    async transform(deps: ReduxLogicDeps, next) {
        const { action, getState } = deps;
        const existingDismissAction = interactionSelectors.getContextMenuOnDismiss(getState());
        if (existingDismissAction) {
            existingDismissAction();
        }
        next(action);
    },
});

/**
 * Interceptor responsible for processing REFRESH actions into individual
 * actions meant to update the directory tree and annotation hierarchy
 */
const refresh = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        try {
            const { getState } = deps;
            const hierarchy = selection.selectors.getAnnotationHierarchy(getState());
            const annotationService = interactionSelectors.getAnnotationService(getState());

            const [annotations, availableAnnotations] = await Promise.all([
                annotationService.fetchAnnotations(),
                annotationService.fetchAvailableAnnotationsForHierarchy(hierarchy),
            ]);
            dispatch(metadata.actions.receiveAnnotations(annotations));
            dispatch(selection.actions.setAvailableAnnotations(availableAnnotations));
        } catch (err) {
            console.error(`Error encountered while refreshing: ${err}`);
            const annotations = metadata.selectors.getAnnotations(deps.getState());
            dispatch(selection.actions.setAvailableAnnotations(annotations.map((a) => a.name)));
        } finally {
            done();
        }
    },
    type: REFRESH,
});

/**
 * Interceptor responsible for processing screen size changes and
 * dispatching appropriate modal changes
 */
const setIsSmallScreen = createLogic({
    process(deps: ReduxLogicDeps, dispatch, done) {
        const { payload: isSmallScreen } = deps.action as SetIsSmallScreenAction;
        const isDisplayingSmallScreenModal = interactionSelectors.getIsDisplayingSmallScreenWarning(
            deps.getState()
        );
        const hasDismissedSmallScreenWarning = interactionSelectors.getHasDismissedSmallScreenWarning(
            deps.getState()
        );

        if (
            isSmallScreen &&
            !isDisplayingSmallScreenModal &&
            !hasDismissedSmallScreenWarning
        ) {
            dispatch(setVisibleModal(ModalType.SmallScreenWarning));
        } else if (!isSmallScreen && isDisplayingSmallScreenModal) {
            dispatch(hideVisibleModal());
        }
        done();
    },
    type: SET_IS_SMALL_SCREEN,
});

export default [refresh, setIsSmallScreen, showContextMenu];
