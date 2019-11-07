import { isEmpty } from "lodash";

import FileFilter from "../../entity/FileFilter";

/**
 * Wrapper for a FileFilter that is responsible for
 *  - fetching file_ids that match its wrapped FileFilters;
 *  - knowing whether a target FileFilter matches any of its wrapped FileFilters
 *  - knowing whether a particular file selection matches its wrapped FileFilters
 */
export default class FileFilterWrapper {
    private _fetchWorker: Worker;
    private _filters: FileFilter[];
    private _fileIds: string[] = [];
    private isFetching: boolean = false;
    private err?: string;

    constructor(filter: FileFilter[], worker: Worker) {
        this._fetchWorker = worker;
        this._filters = filter;

        this.onWorkerMessage = this.onWorkerMessage.bind(this);
        this._fetchWorker.addEventListener("message", this.onWorkerMessage);
    }

    public get filters(): FileFilter[] {
        return this._filters;
    }

    public async ids(): Promise<string[]> {
        await this.loadFileIds();
        return this._fileIds;
    }

    public async getFileIdFromIndex(index: number): Promise<string> {
        const ids = await this.ids();
        return ids[index];
    }

    public loadFileIds(): Promise<void> {
        // if we already have our fileIds, no need to get fetch them; naive attempt at idempotency
        if (!isEmpty(this._fileIds)) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            this.isFetching = true;
            this._fetchWorker.postMessage(this.queryString);

            // poll until isFetching is false
            const interval = setInterval(() => {
                if (!this.isFetching) {
                    clearInterval(interval);

                    if (this.err) {
                        reject(this.err);
                    } else {
                        console.log("have file ids!", this.ids());
                        resolve();
                    }
                }
            }, 250);
        });
    }

    public matches(target: FileFilter) {
        return this.filters.some((filter) => filter.equals(target));
    }

    private get queryString(): string {
        const components = this.filters.map((filter) => filter.toQueryString());

        return `?=${components.join("&")}`;
    }

    private onWorkerMessage(msg: MessageEvent): void {
        if (msg.data.queryString === this.queryString) {
            if (msg.data.hasOwnProperty("err")) {
                this.err = msg.data.err;
            } else if (msg.data.hasOwnProperty("fileIds")) {
                this._fileIds = msg.data.fileIds;
            }
            this.isFetching = false;
        }
    }
}
