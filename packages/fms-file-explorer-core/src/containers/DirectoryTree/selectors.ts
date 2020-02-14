import { createSelector } from "reselect";

import { interaction, selection } from "../../state";
import AnnotationService from "../../services/AnnotationService";
import FileService from "../../services/FileService";

export const getFileService = createSelector(
    [interaction.selectors.getFileExplorerServiceBaseUrl],
    (fileExplorerBaseUrl) => {
        return new FileService({ baseUrl: fileExplorerBaseUrl });
    }
);

export const getAnnotationService = createSelector(
    [interaction.selectors.getFileExplorerServiceBaseUrl],
    (fileExplorerBaseUrl) => {
        return new AnnotationService({ baseUrl: fileExplorerBaseUrl });
    }
);

export const getHierarchy = createSelector(
    [selection.selectors.getAnnotationHierarchy],
    (annotationHierarchy) => {
        return annotationHierarchy.map((annotation) => annotation.name);
    }
);
