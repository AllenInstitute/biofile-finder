import { isEmpty } from "lodash";
import { createSelector } from "reselect";

import { DOWNLOAD } from "../ContextMenu/items";
import { selection } from "../../state";

export const getContextMenuItems = createSelector(
    [selection.selectors.getSelectedFiles],
    (selectedFiles) => {
        const items = [];
        if (isEmpty(selectedFiles)) {
            items.push({ ...DOWNLOAD, disabled: true });
        } else {
            items.push(DOWNLOAD);
        }

        return items;
    }
);
