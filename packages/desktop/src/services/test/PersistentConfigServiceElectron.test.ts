import { expect } from "chai";

import { PersistedConfigKeys } from "../../../../core/services";
import { RUN_IN_RENDERER } from "../../util/constants";
import PersistentConfigServiceElectron from "../PersistentConfigServiceElectron";

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

    describe("getAll", () => {
        it("returns every key persisted", () => {
            // Arrange
            const service = new PersistentConfigServiceElectron({ clearExistingData: true });
            const expectedAllenMountPoint = "/some/path/to/allen";
            const expectedCsvColumns = ["a", "b", "c"];
            const expectedImageJExecutable = "/some/path/to/imageJ";
            const expectedUserSelectedApps = [
                {
                    filePath: "/some/path/to/ZEN",
                    defautlFileKinds: ["CZI"],
                    name: "ZEN",
                },
            ];
            service.persist(PersistedConfigKeys.AllenMountPoint, expectedAllenMountPoint);
            service.persist(PersistedConfigKeys.CsvColumns, expectedCsvColumns);
            service.persist(PersistedConfigKeys.ImageJExecutable, expectedImageJExecutable);
            service.persist(PersistedConfigKeys.UserSelectedApplications, expectedUserSelectedApps);
            const expectedConfig = {
                [PersistedConfigKeys.AllenMountPoint]: expectedAllenMountPoint,
                [PersistedConfigKeys.CsvColumns]: expectedCsvColumns,
                [PersistedConfigKeys.ImageJExecutable]: expectedImageJExecutable,
                [PersistedConfigKeys.UserSelectedApplications]: expectedUserSelectedApps,
            };

            // Act
            const config = service.getAll();

            // Assert
            expect(config).to.deep.equal(expectedConfig);
        });
    });

    describe("persist", () => {
        it("persists every key possible", () => {
            // Arrange
            const service = new PersistentConfigServiceElectron({ clearExistingData: true });
            const config = {
                [PersistedConfigKeys.AllenMountPoint]: "/some/path/to/allen",
                [PersistedConfigKeys.CsvColumns]: ["a", "b"],
                [PersistedConfigKeys.ImageJExecutable]: "/my/imagej",
                [PersistedConfigKeys.UserSelectedApplications]: [
                    {
                        filePath: "/some/path/to/ImageJ",
                        defaultFileKinds: ["OMETIFF"],
                        name: "ImageJ/Fiji",
                    },
                ],
            };

            // Act
            service.persist(config);

            // Assert
            expect(service.getAll()).to.deep.equal(config);
        });

        it(`persists valid ${PersistedConfigKeys.AllenMountPoint}`, () => {
            // Arrange
            const service = new PersistentConfigServiceElectron({ clearExistingData: true });
            const expected = "home/users/me/allen";

            // Act
            service.persist(PersistedConfigKeys.AllenMountPoint, expected);

            // Assert
            const actual = service.get(PersistedConfigKeys.AllenMountPoint);
            expect(actual).to.be.equal(expected);
        });

        it(`rejects invalid ${PersistedConfigKeys.AllenMountPoint}`, () => {
            // Arrange
            const service = new PersistentConfigServiceElectron({ clearExistingData: true });

            // Act / Assert
            expect(() => service.persist(PersistedConfigKeys.AllenMountPoint, [])).to.throw();
        });

        it(`persists valid ${PersistedConfigKeys.CsvColumns}`, () => {
            // Arrange
            const service = new PersistentConfigServiceElectron({ clearExistingData: true });
            const expected = ["FileId", "Filename", "Type"];

            // Act
            service.persist(PersistedConfigKeys.CsvColumns, expected);

            // Assert
            const actual = service.get(PersistedConfigKeys.CsvColumns);
            expect(actual).to.be.deep.equal(expected);
        });

        it(`rejects invalid ${PersistedConfigKeys.CsvColumns}`, () => {
            // Arrange
            const service = new PersistentConfigServiceElectron({ clearExistingData: true });

            // Act / Assert
            expect(() => service.persist(PersistedConfigKeys.CsvColumns, 143)).to.throw();
        });

        it(`overrides existing value for key`, () => {
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
