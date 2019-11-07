import { includes } from "lodash";

import FileFilter from "../../entity/FileFilter";
import FileFilterWrapper from "./FileFilterWrapper";

export interface EventParams {
    ctrlKeyIsPressed: boolean;
    shiftKeyIsPressed: boolean;
}

interface OnSelectCallback {
    (fileId: string | string[]): void;
}

/**
 * To hide complexity related to fetching, storing, and retrieving file_ids for the lazily loaded file lists.
 */
export default class FileIdFetcher {
    private filterGroupings: FileFilterWrapper[];
    private worker: Worker;
    private _onSelect: OnSelectCallback;

    constructor(
        filters: FileFilter[][],
        onSelect: OnSelectCallback,
        preload?: FileFilter[][],
        worker?: Worker
    ) {
        this.worker = worker || new Worker("./file-id-fetcher.worker", { type: "module" });
        this._onSelect = onSelect;
        this.filterGroupings = filters.map(
            (grouping) => new FileFilterWrapper(grouping, this.worker)
        );

        this.filterGroupings.forEach((grouping) => {
            if (includes(preload, grouping.filters)) {
                grouping.loadFileIds().catch(console.error);
            }
        });

        this.onSelect = this.onSelect.bind(this);
    }

    public onSelect(identifiers: { index: number; id: string }, eventParams: EventParams) {
        const { index, id } = identifiers;
        // find the filter grouping that corresponds to the thing that was selected
        if (eventParams.shiftKeyIsPressed) {
            const relevantFilterGrouping = this.filterGroupings[0];
            relevantFilterGrouping
                .getFileIdFromIndex(index)
                .then((fileId) => console.log(`The file id of row ${index} is ${fileId}`));
        } else if (id) {
            console.log(`The file id of row ${index} is ${id}`);
        }

        // now, call some function that tells redux that we have new selection
    }
}
