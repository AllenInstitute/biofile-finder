import { expect } from "chai";
import FmsFilePath from "../FmsFilePath";

describe("FmsFilePath", () => {
    describe("formatForOs", () => {
        const dbPath = "/allen/programs/allencell/fms/object.foo";

        it("does nothing to the path for Linux hosts", () => {
            // Arrange / Act
            const actual = new FmsFilePath(dbPath).formatForOs("Linux");

            // Assert
            expect(actual).to.equal(dbPath);
        });

        it("swaps out slashes on Windows hosts and turns the path into a UNC path", () => {
            // Arrange / Act
            const actual = new FmsFilePath(dbPath).formatForOs("Windows_NT", "\\");

            // Assert
            expect(actual).to.equal(String.raw`\\allen\programs\allencell\fms\object.foo`);
        });

        it("accounts for a different mount point (relevant to macOS)", () => {
            // Arrange / Act
            const actual = new FmsFilePath(dbPath)
                .withMountPoint("/Volumes/programs")
                .formatForOs("Darwin");

            // Assert
            expect(actual).to.equal("/Volumes/programs/allencell/fms/object.foo");
        });
    });
});
