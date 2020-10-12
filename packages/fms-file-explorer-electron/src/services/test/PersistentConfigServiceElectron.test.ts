import { expect } from "chai";

import { RUN_IN_RENDERER } from "../../util/constants";
import PersistentConfigServiceElectron from "../PersistentConfigServiceElectron";

// GM 9/15/20: This symbol is in fact exported from @aics/fms-file-explorer-core, but inexplicably,
// using `import` machinery causes tests to hang. All attempts to debug this have been unsuccesful so far.
const {
    PersistedDataKeys,
} = require("@aics/fms-file-explorer-core/nodejs/services/PersistentConfigService");

describe(`${RUN_IN_RENDERER} PersistentConfigServiceElectron`, () => {
    describe("get", () => {
        it("returns expected value everytime", () => {
            // Arrange
            const service = new PersistentConfigServiceElectron({ clearExistingData: true });
            const expected = "my/path/going/somewhere/allen";
            service.set(PersistedDataKeys.AllenMountPoint, expected);

            // Act / Assert
            for (let i = 0; i < 5; i++) {
                expect(service.get(PersistedDataKeys.AllenMountPoint)).to.be.equal(expected);
            }
        });

        it("returns undefined when key does not exist", () => {
            // Arrange
            const service = new PersistentConfigServiceElectron({ clearExistingData: true });

            // Act
            const actual = service.get(PersistedDataKeys.AllenMountPoint);

            // Assert
            expect(actual).to.be.undefined;
        });
    });

    describe("set", () => {
        it(`saves valid ${PersistedDataKeys.AllenMountPoint}`, async () => {
            // Arrange
            const service = new PersistentConfigServiceElectron({ clearExistingData: true });
            const expected = "home/users/me/allen";

            // Act
            service.set(PersistedDataKeys.AllenMountPoint, expected); // TODO: Expect to throw!

            // Assert
            const actual = service.get(PersistedDataKeys.AllenMountPoint);
            expect(actual).to.be.equal(expected);
        });

        it(`rejects invalid ${PersistedDataKeys.AllenMountPoint}`, async () => {
            // Arrange
            const service = new PersistentConfigServiceElectron({ clearExistingData: true });

            // Act / Assert
            expect(() => service.set(PersistedDataKeys.AllenMountPoint, [])).to.throw();
        });

        it(`saves valid ${PersistedDataKeys.CsvColumns}`, async () => {
            // Arrange
            const service = new PersistentConfigServiceElectron({ clearExistingData: true });
            const expected = ["FileId", "Filename", "Type"];

            // Act
            service.set(PersistedDataKeys.CsvColumns, expected);

            // Assert
            const actual = service.get(PersistedDataKeys.CsvColumns);
            expect(actual).to.be.deep.equal(expected);
        });

        it(`rejects invalid ${PersistedDataKeys.CsvColumns}`, async () => {
            // Arrange
            const service = new PersistentConfigServiceElectron({ clearExistingData: true });

            // Act / Assert
            expect(() => service.set(PersistedDataKeys.CsvColumns, 143)).to.throw();
        });

        it(`overrides existing value for key`, async () => {
            // Arrange
            const service = new PersistentConfigServiceElectron({ clearExistingData: true });
            const expected = ["FileId", "Filename", "Type"];

            // Act
            service.set(PersistedDataKeys.CsvColumns, ["Cell Line"]);
            service.set(PersistedDataKeys.CsvColumns, expected);
            service.set(PersistedDataKeys.AllenMountPoint, "/my/path/allen");

            // Assert
            const actual = service.get(PersistedDataKeys.CsvColumns);
            expect(actual).to.be.deep.equal(expected);
        });
    });
});
