import { noop } from "lodash";
import DatabaseService from ".";

export default class DatabaseServiceNoop extends DatabaseService {
    public deleteSourceMetadata(): Promise<void> {
        return Promise.reject("DatabaseServiceNoop:deleteSourceMetadata");
    }

    public deleteSourceProvenance(): Promise<void> {
        return Promise.reject("DatabaseServiceNoop:deleteSourceProvenance");
    }

    public execute(): Promise<void> {
        return Promise.reject("DatabaseServiceNoop:execute");
    }

    public prepareDataSources() {
        return Promise.resolve();
    }

    public saveQuery(): Promise<Uint8Array> {
        return Promise.reject("DatabaseServiceNoop:saveQuery");
    }

    public query(): {
        promise: Promise<{ [key: string]: any }[]>;
        cancel?: (reason?: string) => void;
    } {
        return { promise: Promise.reject("DatabaseServiceNoop:query"), cancel: noop };
    }

    protected addDataSource(): Promise<void> {
        return Promise.reject("DatabaseServiceNoop:addDataSource");
    }
}
