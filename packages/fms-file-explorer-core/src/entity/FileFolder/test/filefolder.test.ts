import { expect } from "chai";

import FileFolder from "../";

describe("FileFolder", () => {
    describe("equals", () => {
        it("returns true when other file folder is the same", () => {
            // Arrange
            const fileFolder = new FileFolder(["AICS-0", "64", "false"]);
            const otherFileFolder = new FileFolder(["AICS-0", "64", "false"]);

            // Act
            const result = fileFolder.equals(otherFileFolder);

            // Assert
            expect(result).to.be.true;
        });

        it("returns false when other file folder has more in its hierarchy", () => {
            // Arrange
            const fileFolder = new FileFolder(["AICS-0", "64"]);
            const otherFileFolder = new FileFolder(["AICS-0", "64", "false"]);

            // Act
            const result = fileFolder.equals(otherFileFolder);

            // Assert
            expect(result).to.be.false;
        });

        it("returns false when other file folder has different values", () => {
            // Arrange
            const fileFolder = new FileFolder(["AICS-0", "14", "false"]);
            const otherFileFolder = new FileFolder(["AICS-0", "64", "false"]);

            // Act
            const result = fileFolder.equals(otherFileFolder);

            // Assert
            expect(result).to.be.false;
        });
    });

    describe("includesSubFileFolder", () => {
        it("returns true when it contain sub file folder", () => {
            // Arrange
            const fileFolder = new FileFolder(["AICS-0", "64", "false"]);
            const subFileFolder = new FileFolder(["AICS-0", "64"]);

            // Act
            const result = fileFolder.includesSubFileFolder(subFileFolder);

            // Assert
            expect(result).to.be.true;
        });

        it("returns false when it does not contain sub file folder", () => {
            // Arrange
            const fileFolder = new FileFolder(["AICS-0", "64"]);
            const subFileFolder = new FileFolder(["AICS-0", "64", "false"]);

            // Act
            const result = fileFolder.includesSubFileFolder(subFileFolder);

            // Assert
            expect(result).to.be.false;
        });
    });

    describe("addAnnotationAtIndex", () => {
        it("returns file folder with same path after adding annotation at higher index", () => {
            // Arrange
            const fileFolder = new FileFolder(["AICS-0", "63", "false"]);

            // Act
            const result = fileFolder.addAnnotationAtIndex(4);

            // Assert
            expect(fileFolder.equals(result)).to.be.true;
        });

        it("returns undefined if adding an annotation to the highest level (index 0)", () => {
            // Arrange
            const fileFolder = new FileFolder(["AICS-0", "63", "false"]);

            // Act
            const result = fileFolder.addAnnotationAtIndex(0);

            // Assert
            expect(result).to.be.undefined;
        });
    });

    describe("removeAnnotationAtIndex", () => {
        it("returns file folder with same path after removing annotation at higher index", () => {
            // Arrange
            const fileFolder = new FileFolder(["AICS-0", "63", "false"]);
            const expectedFileFolder = new FileFolder(["AICS-0", "63", "false"]);

            // Act
            const result = fileFolder.removeAnnotationAtIndex(4);

            // Assert
            expect(expectedFileFolder.equals(result)).to.be.true;
        });

        it("returns file folder with updated path after removing annotation within path", () => {
            // Arrange
            const fileFolder = new FileFolder(["AICS-0", "63", "false"]);
            const expectedFileFolder = new FileFolder(["63", "false"]);

            // Act
            const result = fileFolder.removeAnnotationAtIndex(0);

            // Assert
            expect(expectedFileFolder.equals(result)).to.be.true;
        });

        it("returns undefined after removing annotation at index 0 from file folder with one value", () => {
            // Arrange
            const fileFolder = new FileFolder(["AICS-0"]);

            // Act
            const result = fileFolder.removeAnnotationAtIndex(0);

            // Assert
            expect(result).to.be.undefined;
        });
    });

    describe("reorderAnnotations", () => {
        it("returns rearranged file folder along with any sub-folders", () => {
            // Arrange
            const fileFolder = new FileFolder(["AICS-0", "false", "234141"]);
            const annotationIndexMap = {
                0: 2,
                1: 0,
                2: 1,
            };
            const expectedFileFolders = [
                new FileFolder(["234141", "AICS-0", "false"]),
                new FileFolder(["234141", "AICS-0"]),
                new FileFolder(["234141"]),
            ];

            // Act
            const result = fileFolder.reorderAnnotations(annotationIndexMap);

            // Assert
            expect(result.length).to.be.equal(expectedFileFolders.length);
            expectedFileFolders.forEach((fileFolder) => {
                expect(result.some((f) => f.equals(fileFolder))).to.be.true;
            });
        });

        it("returns same file folder along with sub-folders when reordered annotations were unrelated", () => {
            // Arrange
            const fileFolder = new FileFolder(["AICS-0", "false"]);
            const annotationIndexMap = {
                0: 0,
                1: 1,
                2: 3,
                3: 2,
            };
            const expectedFileFolders = [
                new FileFolder(["AICS-0", "false"]),
                new FileFolder(["AICS-0"]),
            ];

            // Act
            const result = fileFolder.reorderAnnotations(annotationIndexMap);

            // Assert
            expect(result.length).to.be.equal(expectedFileFolders.length);
            expectedFileFolders.forEach((fileFolder) => {
                expect(result.some((f) => f.equals(fileFolder))).to.be.true;
            });
        });

        it("returns no file folders when file folder is put under closed annotation", () => {
            // Arrange
            const fileFolder = new FileFolder(["AICS-0", "false"]);
            const annotationIndexMap = {
                0: 2,
                1: 0,
                2: 1,
            };

            // Act
            const result = fileFolder.reorderAnnotations(annotationIndexMap);

            // Assert
            expect(result).to.be.empty;
        });
    });
});
