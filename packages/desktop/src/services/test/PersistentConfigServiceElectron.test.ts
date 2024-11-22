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
            const expectedHasUsedApplicationBefore = true;
            const expectedUserSelectedApps = [
                {
                    filePath: "/some/path/to/ZEN",
                    defautlFileKinds: ["CZI"],
                    name: "ZEN",
                },
            ];
            const expectedRecentAnnotations = ["column"];
            const expectedQueries = [
                {
                    name: "foo",
                    url: "bar",
                },
            ];
            const expectedDisplayAnnotations = [
                {
                    annotationDisplayName: "Foo",
                    annotationName: "foo",
                    description: "foo-long",
                    type: "string",
                    units: "string",
                },
            ];
            const expectedColumns = [{ file_size: 0.4 }, { file_name: 0.6 }];

            service.persist(PersistedConfigKeys.AllenMountPoint, expectedAllenMountPoint);
            service.persist(PersistedConfigKeys.Columns, expectedColumns);
            service.persist(PersistedConfigKeys.CsvColumns, expectedCsvColumns);
            service.persist(PersistedConfigKeys.ImageJExecutable, expectedImageJExecutable);
            service.persist(PersistedConfigKeys.Queries, expectedQueries);
            service.persist(
                PersistedConfigKeys.HasUsedApplicationBefore,
                expectedHasUsedApplicationBefore
            );
            service.persist(PersistedConfigKeys.UserSelectedApplications, expectedUserSelectedApps);
            service.persist(PersistedConfigKeys.DisplayAnnotations, expectedDisplayAnnotations);
            service.persist(PersistedConfigKeys.RecentAnnotations, expectedRecentAnnotations);

            const expectedConfig = {
                [PersistedConfigKeys.AllenMountPoint]: expectedAllenMountPoint,
                [PersistedConfigKeys.Columns]: expectedColumns,
                [PersistedConfigKeys.CsvColumns]: expectedCsvColumns,
                [PersistedConfigKeys.ImageJExecutable]: expectedImageJExecutable,
                [PersistedConfigKeys.Queries]: expectedQueries,
                [PersistedConfigKeys.HasUsedApplicationBefore]: expectedHasUsedApplicationBefore,
                [PersistedConfigKeys.UserSelectedApplications]: expectedUserSelectedApps,
                [PersistedConfigKeys.DisplayAnnotations]: expectedDisplayAnnotations,
                [PersistedConfigKeys.RecentAnnotations]: expectedRecentAnnotations,
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
                [PersistedConfigKeys.Columns]: [
                    { name: "a", width: 0.25 },
                    { name: "b", width: 0.3 },
                ],
                [PersistedConfigKeys.CsvColumns]: ["a", "b"],
                [PersistedConfigKeys.ImageJExecutable]: "/my/imagej",
                [PersistedConfigKeys.Queries]: [],
                [PersistedConfigKeys.HasUsedApplicationBefore]: undefined,
                [PersistedConfigKeys.RecentAnnotations]: ["column"],
                [PersistedConfigKeys.UserSelectedApplications]: [
                    {
                        filePath: "/some/path/to/ImageJ",
                        defaultFileKinds: ["OMETIFF"],
                        name: "ImageJ/Fiji",
                    },
                ],
                [PersistedConfigKeys.DisplayAnnotations]: [
                    {
                        annotationDisplayName: "Foo",
                        annotationName: "foo",
                        description: "foo-long",
                        type: "string",
                        units: "string",
                    },
                ],
            };

            // Act
            service.persist(config);

            // Assert
            expect(service.getAll()).to.deep.equal(config);
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
