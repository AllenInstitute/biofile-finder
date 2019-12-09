import { createSelector } from "reselect";

import FileService from "../../services/FileService";
import FileSet from "../../entity/FileSet";

// TODO
export const getFileSetTree = createSelector(
    [],
    () => {
        const fileService = new FileService();
        return [new FileSet(fileService)];
    }
);
