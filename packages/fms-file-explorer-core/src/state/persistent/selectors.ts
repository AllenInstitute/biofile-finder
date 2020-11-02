import { State } from "..";

// BASIC SELECTORS
export const getAllenMountPoint = (state: State) => state.persistent.ALLEN_MOUNT_POINT;
export const getCsvColumns = (state: State) => state.persistent.CSV_COLUMNS;
export const getImageJExecutable = (state: State) => state.persistent.IMAGE_J_EXECUTABLE;
