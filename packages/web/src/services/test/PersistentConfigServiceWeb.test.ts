import { expect } from "chai";

import { PersistedConfigKeys } from "../../../../core/services";
import PersistentConfigServiceWeb from "../PersistentConfigServiceWeb";

describe("PersistentConfigServiceWeb", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe("get", () => {
        it("retrieves from localStorage", () => {
            // Arrange
            const expectedValue = "test value";
            const service = new PersistentConfigServiceWeb();
            localStorage.setItem(PersistedConfigKeys.HasUsedApplicationBefore, expectedValue);

            // Act
            const actualValue = service.get(PersistedConfigKeys.HasUsedApplicationBefore);

            // Assert
            expect(actualValue).to.equal(expectedValue);
        });

        it("returns undefined when key does not exist", () => {
            // Arrange
            const service = new PersistentConfigServiceWeb({ clearExistingData: true });

            // Act
            const actual = service.get(PersistedConfigKeys.ImageJExecutable);

            // Assert
            expect(actual).to.be.undefined;
        });
    });

    describe("getAll", () => {
        // Currently just a smoke test since we only store one key so far in web
        it("retrieves all persisted keys", () => {
            // Arrange
            const service = new PersistentConfigServiceWeb();
            localStorage.setItem(PersistedConfigKeys.HasUsedApplicationBefore, "true");

            // Act
            const persistedKeys = service.getAll();
            const keysWithValues = Object.values(persistedKeys).filter((val) => val != undefined);

            // Assert
            expect(Object.values(persistedKeys).length).to.equal(
                Object.values(PersistedConfigKeys).length
            );
            expect(keysWithValues.length).to.equal(1);
        });
    });

    describe("persist", () => {
        it(`persists valid ${PersistedConfigKeys.HasUsedApplicationBefore}`, () => {
            // Arrange
            const service = new PersistentConfigServiceWeb({ clearExistingData: true });
            const expected = "true";

            // Act
            service.persist(PersistedConfigKeys.HasUsedApplicationBefore, "true");

            // Assert
            const actual = service.get(PersistedConfigKeys.HasUsedApplicationBefore);
            expect(actual).to.equal(expected);
        });

        it("clears keys when value is undefined", () => {
            // Arrange
            const service = new PersistentConfigServiceWeb();

            // consistency check
            service.persist(PersistedConfigKeys.HasUsedApplicationBefore, "true");
            const intermediateValue = service.get(PersistedConfigKeys.HasUsedApplicationBefore);
            expect(intermediateValue).to.equal("true");

            // Act
            service.persist(PersistedConfigKeys.HasUsedApplicationBefore, undefined);
            const actual = service.get(PersistedConfigKeys.HasUsedApplicationBefore);

            // Assert
            expect(actual).to.be.undefined;
        });
    });
});
