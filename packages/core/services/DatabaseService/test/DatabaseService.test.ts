import { expect } from "chai";

import DatabaseService from "..";

describe("DatabaseService", () => {
    describe("fetchAnnotations", () => {
        const annotations = ["A", "B", "Cc", "dD"].map((name) => ({
            name,
        }));

        // DatabaseService is abstract so we need a dummy impl to test
        // implemented methods
        class DatabaseServiceDummyImpl extends DatabaseService {
            saveQuery(): Promise<Uint8Array> {
                throw new Error("Not implemented in dummy impl");
            }
            execute(): Promise<void> {
                throw new Error("Not implemented in dummy impl");
            }
            addDataSource(): Promise<void> {
                throw new Error("Not implemented in dummy impl");
            }
            query(): Promise<any> {
                return Promise.resolve(annotations);
            }
        }

        it("issues request for all available Annotations", async () => {
            const service = new DatabaseServiceDummyImpl();
            const actualAnnotations = await service.fetchAnnotations(["foo"]);
            expect(actualAnnotations.length).to.equal(4);
        });
    });
});
