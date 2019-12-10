import { createSelector } from "reselect";

import FileSet from "../../entity/FileSet";

// TODO
export const getFileSetTree = createSelector(
    [],
    () => {
        return [new FileSet()];
    }
);
