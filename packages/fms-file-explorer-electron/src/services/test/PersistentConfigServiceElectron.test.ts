import { expect } from "chai";

import { RUN_IN_RENDERER } from "../../util/constants";
import PersistentConfigServiceElectron from "../PersistentConfigServiceElectron";

// GM 9/15/20: This symbol is in fact exported from @aics/fms-file-explorer-core, but inexplicably,
// using `import` machinery causes tests to hang. All attempts to debug this have been unsuccesful so far.
const {
    PersistedConfigKeys,
} = require("@aics/fms-file-explorer-core/nodejs/services/PersistentConfigService");

describe(`${RUN_IN_RENDERER} PersistentConfigServiceElectron`, () => {
    describe("get", () => {
        it("returns expected value everytime", () => {
            // Arrange
            const service = new PersistentConfigServiceElectron({ clearExistingData: true });
            const expected = "my/path/going/somewhere/allen";
            service.persist(PersistedConfigKeys.AllenMountPoint, expected);

            // Act / Assert
            for (let i = 0; i < 5; i++) {
                expect(service.get(PersistedConfigKeys.AllenMountPoint)).to.be.equal(expected);
            }
        });

        it("returns default when key does not exist & default does", () => {
            // Arrange
            const service = new PersistentConfigServiceElectron({ clearExistingData: true });

            // Act
            const actual = service.get(PersistedConfigKeys.AllenMountPoint);

            // Assert
            expect(actual).to.not.be.undefined;
        });

        it("returns undefined when key does not exist & no default does", () => {
            // Arrange
            const service = new PersistentConfigServiceElectron({ clearExistingData: true });

            // Act
            const actual = service.get(PersistedConfigKeys.ImageJExecutable);

            // Assert
            expect(actual).to.be.undefined;
        });
    });

    describe("set", () => {
        it(`saves valid ${PersistedConfigKeys.AllenMountPoint}`, async () => {
            // Arrange
            const service = new PersistentConfigServiceElectron({ clearExistingData: true });
            const expected = "home/users/me/allen";

            // Act
            service.persist(PersistedConfigKeys.AllenMountPoint, expected); // TODO: Expect to throw!

            // Assert
            const actual = service.get(PersistedConfigKeys.AllenMountPoint);
            expect(actual).to.be.equal(expected);
        });

        it(`rejects invalid ${PersistedConfigKeys.AllenMountPoint}`, async () => {
            // Arrange
            const service = new PersistentConfigServiceElectron({ clearExistingData: true });

            // Act / Assert
            expect(() => service.persist(PersistedConfigKeys.AllenMountPoint, [])).to.throw();
        });

        it(`saves valid ${PersistedConfigKeys.CsvColumns}`, async () => {
            // Arrange
            const service = new PersistentConfigServiceElectron({ clearExistingData: true });
            const expected = ["FileId", "Filename", "Type"];

            // Act
            service.persist(PersistedConfigKeys.CsvColumns, expected);

            // Assert
            const actual = service.get(PersistedConfigKeys.CsvColumns);
            expect(actual).to.be.deep.equal(expected);
        });

        it(`rejects invalid ${PersistedConfigKeys.CsvColumns}`, async () => {
            // Arrange
            const service = new PersistentConfigServiceElectron({ clearExistingData: true });

            // Act / Assert
            expect(() => service.persist(PersistedConfigKeys.CsvColumns, 143)).to.throw();
        });

        it(`overrides existing value for key`, async () => {
            // Arrange
            const service = new PersistentConfigServiceElectron({ clearExistingData: true });
            const expected = ["FileId", "Filename", "Type"];

            // Act
            service.persist(PersistedConfigKeys.CsvColumns, ["Cell Line"]);
            service.persist(PersistedConfigKeys.CsvColumns, expected);
            service.persist(PersistedConfigKeys.AllenMountPoint, "/my/path/allen");

            // Assert
            const actual = service.get(PersistedConfigKeys.CsvColumns);
            expect(actual).to.be.deep.equal(expected);
        });
    });
});
