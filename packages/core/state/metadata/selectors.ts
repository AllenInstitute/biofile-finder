import { orderBy, uniqBy } from "lodash";
import { createSelector } from "reselect";

import { State } from "../";
import Annotation from "../../entity/Annotation";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../constants";
import { Dataset } from "../../services/DatasetService";

// BASIC SELECTORS
export const getAnnotations = (state: State) => state.metadata.annotations;
export const getDatasets = (state: State) => state.metadata.datasets;

// COMPOSED SELECTORS
export const getSortedAnnotations = createSelector(getAnnotations, (annotations: Annotation[]) =>
    Annotation.sort(annotations)
);

export const getCustomAnnotationsCombinedWithFileAttributes = createSelector(
    getSortedAnnotations,
    (annotations) => Annotation.sort([...TOP_LEVEL_FILE_ANNOTATIONS, ...annotations])
);

export const getActiveDatasets = createSelector(getDatasets, (datasets): Dataset[] =>
    uniqBy(
        orderBy(datasets, ["name", "version"], ["asc", "desc"]),
        (dataset) => `${dataset.name}${dataset.version}`
    ).filter((dataset) => !dataset.expiration || new Date(dataset.expiration) > new Date())
);
